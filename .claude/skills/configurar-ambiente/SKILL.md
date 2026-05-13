---
name: configurar-ambiente
description: Guia o usuário no setup inicial do agent-playwright — copia .env.example para .env, valida credenciais Twygo, instala deps, baixa Chromium, roda smoke. Use quando o usuário disser "como configuro", "primeiro setup", "preciso rodar isso", "o que falta pra rodar", ou der erro tipo `Variável de ambiente "TWYGO_*" referenciada... mas não definida`.
version: 1.0.0
---

# configurar-ambiente

Skill operacional para colocar o agent-playwright no ar do zero ou diagnosticar
um setup pela metade. **Não gera teste, não roda suíte** — só prepara o
ambiente.

## Quando invocar

- Primeiro uso da máquina: clone fresco, `npm install` ainda não rodou.
- Erro de credenciais: `Variável de ambiente "TWYGO_STAGING_PASSWORD"
  referenciada em config/environment.json mas não definida`.
- Erro de browser: `browserType.launch: Executable doesn't exist...
  npx playwright install`.
- Storage corrompido / login falhando no `globalSetup`.
- QA novo no time perguntando "como rodo isso?".

## Pré-requisitos da máquina

| Ferramenta | Versão mínima | Onde checar |
|---|---|---|
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |
| Java JRE | 17+ (só pra Allure regressivo) | `java -version` |

Se faltar algo, oriente o usuário a instalar antes — **não tente rodar `apt`,
`brew`, etc. silenciosamente**.

## Fluxo canônico (ordem importa)

### 1. Verificar onde está

```bash
pwd
```

Tem que estar em `agent-playwright/`. Se estiver na raiz do monorepo,
`cd agent-playwright`.

### 2. Instalar dependências Node

```bash
npm install
```

Roda 1× por clone. Reinstale se `package.json` mudou desde último pull.

### 3. Baixar Chromium do Playwright

```bash
npx playwright install chromium
```

1× por máquina. Os 3 subagents oficiais do Playwright (planner/generator/healer)
e o `globalSetup` precisam dele instalado.

### 4. Configurar credenciais

```bash
cp .env.example .env
```

Abra `.env` e preencha:

```env
TWYGO_STAGING_EMAIL=<email do user de QA staging>
TWYGO_STAGING_PASSWORD=<senha staging>

TWYGO_STAGING_WITHOUT_CREDITS_EMAIL=<email do user "sem créditos">
TWYGO_STAGING_WITHOUT_CREDITS_PASSWORD=<senha do user "sem créditos">
```

Onde achar as credenciais: peça ao QA Lead, **nunca** procure em PR antigo
ou commit. `.env` está no `.gitignore` — não vai pro repositório.

> **Por que duas credenciais?** O `staging` principal tem créditos sobrando.
> Para testar bloqueio de funcionalidades quando a org está zerada, o
> `globalSetup` loga separadamente em `staging-without-credits` e grava
> `outputs/.auth/storage-without-credits.json`. Specs que precisam dele
> usam `test.use({ storageState: SECONDARY_STORAGE_PATH })`.
> Ver CLAUDE.md §7.5 (cenários sem saldo de créditos).

### 5. Validar setup com typecheck

```bash
npm run typecheck
```

Deve passar sem erros. Se der erro de tipos em arquivos que você não tocou,
investigue antes de seguir.

### 6. Validar que `.env` carrega

```bash
node -e "require('dotenv').config(); console.log('email:', process.env.TWYGO_STAGING_EMAIL ? 'ok' : 'VAZIO')"
```

Saída esperada: `email: ok`.

Se imprimiu `VAZIO`: `.env` não está sendo lido. Confira:
- Está dentro de `agent-playwright/` (não na raiz do monorepo)?
- Linhas têm `KEY=valor` sem aspas?
- Sem espaço antes do `=`?

### 7. Smoke test (login real Twygo)

```bash
npm run agent:smoke
```

Esse comando:
- Lê `config/environment.json` com placeholders já expandidos
- Faz login real em `stage10.stage.twygoead.com/users/login`
- Grava `outputs/.auth/storage.json`
- Confirma que o ambiente respondeu

Se o smoke passa, ambiente está pronto. Se falha, **ler a mensagem antes de
mexer**:

| Erro | Causa provável | Fix |
|---|---|---|
| `Variável "TWYGO_*" não definida` | `.env` faltando ou linha incompleta | volta passo 4 |
| `net::ERR_NAME_NOT_RESOLVED` | sem internet ou DNS bloqueando staging | confirma rede / VPN |
| `Login falhou` na page | senha errada, conta bloqueada | confirma credenciais com QA Lead |
| `Executable doesn't exist` | Chromium não instalado | volta passo 3 |
| `TimeoutError ... waiting for getByRole('textbox', { name: 'Login' })` | ambiente fora **OU** layout mudou **OU** storage corrompido | rode skill [`debugar-smoke-login`](../debugar-smoke-login/SKILL.md) — checklist de 1min cobre as 4 causas-raiz típicas |

## Diagnóstico rápido (cheat sheet)

Quando o usuário fala "não tá rodando" sem detalhar:

```bash
# checklist em 1 minuto
node --version              # 20+?
ls .env                     # existe?
grep -c '^TWYGO_.*=.\+$' .env  # 8 esperado (4 envs × email/senha) ou ≥2 se rodando só staging principal
ls outputs/.auth/           # storage está lá?
ls node_modules/.bin/playwright  # deps ok?
```

Se as 5 falham/zeros: usuário pulou setup, leve pelos passos 2→7. Se só
storage ausente: rode `npm run agent:smoke`. Se só `.env` faltando: passo 4.

## O que NÃO fazer

- ❌ NÃO commitar `.env` (já está no `.gitignore`, mas confirme com `git status`).
- ❌ NÃO escrever credenciais direto em `config/environment.json` — a regra
  dura #4 do CLAUDE.md proíbe.
- ❌ NÃO deletar `outputs/.auth/storage.json` "pra resolver" — o `globalSetup`
  re-loga sozinho se ele tem >30min ou está corrompido.
- ❌ NÃO instalar `playwright` global (`npm install -g`); o projeto usa a
  versão local de `node_modules/.bin/playwright`.

## Atualizar credenciais (rotação)

1. Pegue a nova senha com o QA Lead.
2. Edite `.env` (linha `TWYGO_STAGING_PASSWORD=...`).
3. Invalide o storage antigo:
   ```bash
   rm outputs/.auth/storage.json outputs/.auth/storage-without-credits.json
   ```
4. Rode `npm run agent:smoke` pra re-logar e validar.

## Referências

- `agent-playwright/.env.example` — template das variáveis
- `agent-playwright/CLAUDE.md` §7.6 anti-pattern B — proibição de hardcode
- `agent-playwright/.claude/SETUP.md` — setup completo (MCPs, plugin Playwright)
- `agent-playwright/src/utils/environment.ts` — `loadEnvironmentConfig()` é o
  ponto único que expande `${VAR}`
