---
name: debugar-smoke-login
description: Sequência de diagnóstico quando o smoke do agente Playwright (`npm run agent:smoke`) falha no `globalSetup` com `TimeoutError: locator.fill: Timeout 30000ms exceeded` em `LoginPage.login()`. Cobre as 4 causas-raiz típicas (ambiente fora, .env incompleto, layout mudou, storageState corrompido). Use quando aparecer "Smoke test falhou — não vou prosseguir" ou timeout no textbox `Login`/`Senha`.
version: 1.0.0
---

# debugar-smoke-login

Skill de diagnóstico, não de fix. **Não mexa em código antes de saber em
qual das 4 categorias o problema cai** — escolhas erradas (mudar seletor,
re-gerar storage, regenerar `.env`) escondem o sintoma e custam tempo.

## Sintoma canônico

```
[INFO] Login global "<env>" em https://<host>/users/login...
TimeoutError: locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: 'Login' })
  at src/pages/LoginPage.ts:31
[ERROR] Smoke test falhou — não vou prosseguir com planner/execução.
```

## Checklist de 1 minuto (ordem importa)

Rode os 4 comandos e classifique por qual falhou primeiro. **Não pule
etapas** — cada uma mata uma hipótese sem custo.

### 1. Ambiente Twygo está no ar?

```bash
curl -sI https://<host-staging>/users/login | head -3
```

Substitua `<host-staging>` pelo `baseUrl` do env atual em
`config/environment.json` (sem o `https://` final). Para o projeto widgets:
`widgets.stage.twygoead.com`.

| Resposta | Diagnóstico | Ação |
|---|---|---|
| `HTTP/2 200` | Ambiente OK | seguir pro passo 2 |
| `HTTP/2 503` | **Staging fora** (causa #1) | parar; avisar QA Lead; tentar mais tarde |
| `HTTP/2 502/504` | Backend caído | parar; avisar QA Lead |
| `Could not resolve host` | DNS / VPN | confirmar conexão; sair de VPN se for o caso |
| Timeout do curl | Sem rota até host | confirmar rede |

> **Por que primeiro**: ambiente fora gera EXATAMENTE o mesmo timeout
> que seletor errado. Sem este passo você gasta 30min mexendo em
> `LoginPage.ts` à toa. Foi exatamente o que aconteceu em 2026-05-08
> (3 hosts staging em 503 simultâneos).

### 2. `.env` está completo?

```bash
grep -c '^TWYGO_.*=.\+$' .env
```

Resposta esperada: `4` (4 vars TWYGO_* preenchidas — ver `.env.example`).

| Saída | Diagnóstico | Ação |
|---|---|---|
| `4` | `.env` OK | seguir pro passo 3 |
| `< 4` | **Variável vazia** (causa #2) | abrir `.env`, completar; usar skill `configurar-ambiente` |
| `0` ou erro `No such file` | `.env` faltando | `cp .env.example .env` + completar |

> Validação adicional rápida: `npx tsx -e "import('./src/utils/environment.js').then(m => console.log(m.loadEnvironmentConfig().staging.credentials.email))"` — se sair com `${TWYGO_*}` literal, alguma var está unset; se sair com email real, OK.

### 3. Layout da página de login mudou?

Capture o HTML real:

```bash
curl -sk https://<host-staging>/users/login | grep -iE 'name="(login|senha|email|password)"|getByRole|placeholder' | head -10
```

| Saída | Diagnóstico | Ação |
|---|---|---|
| Tem inputs com `name="user[email]"` e `name="user[password]"` + label `Login`/`Senha` visível | Layout canônico | causa #3 descartada — ir pro passo 4 |
| Inputs sem label visível, ou labels mudaram (`Email` em vez de `Login`) | **Layout alterado** (causa #3) | atualizar `src/pages/LoginPage.ts` linha 14-15 (selectors `getByRole`); abrir PR + atualizar este skill com o novo layout |
| HTML é página de manutenção / "Em breve" / Cloudflare | Ambiente em deploy | esperar; confirmar com #devops |

### 4. storageState corrompido forçando re-login que falha?

```bash
ls -la outputs/.auth/
cat outputs/.auth/storage.json 2>/dev/null | jq '.cookies | length'
```

| Saída | Diagnóstico | Ação |
|---|---|---|
| `storage.json` ausente | Primeiro run — esperado fazer login | sintoma deve ter outra causa; volta passo 1-3 |
| `cookies: 0` ou JSON inválido | **Storage corrompido** (causa #4) | `rm outputs/.auth/storage.json` e re-rodar smoke |
| `cookies: > 0` e `mtime > 30min` | Storage expirado (TTL) | smoke já re-loga sozinho; sintoma é outra causa |

## Decisão final

Se o passo 1 deu 5xx → **causa #1, ambiente fora**. Não mexer em código.
Avisar e parar.

Se o passo 2 falhou → **causa #2, .env**. Skill `configurar-ambiente`.

Se o passo 3 falhou → **causa #3, layout**. Atualizar `LoginPage.ts` E
atualizar este skill com o novo layout no fim.

Se chegou no passo 4 e está corrompido → **causa #4, storage**. Apaga e
re-roda.

Se passou nos 4 e ainda falha → caso novo. **Não chute** — abra issue
com o output completo do `npm run agent:smoke` + saída dos 4 comandos
acima, e atualize esta skill com a nova causa-raiz quando descobrir.

## Por que esta skill existe

Diagnosticar smoke quebrado custa 15-30min se você for tentando fixes ao
acaso. Os 4 comandos acima resolvem em 1min. Foi documentado depois do
incidente 2026-05-08 quando o staging Twygo caiu em 503 e o agente
gastou tentativas de re-fill do textbox por 30s — sintoma idêntico ao
de seletor frágil.

## Anti-pattern: NÃO faça isso

- ❌ Mexer em `LoginPage.ts` antes de rodar `curl` (ambiente fora se
  manifesta igual a seletor errado).
- ❌ Apagar `outputs/.auth/storage.json` "pra resolver" sem checar
  passos 1-3 (storage só é causa quando os 3 anteriores estão OK).
- ❌ Trocar credencial no `.env` sem confirmar passo 2 (rotação à toa
  invalida o que já estava certo).
- ❌ Atualizar este skill com "causa nova" sem confirmar com o usuário
  primeiro (segue regra meta do CLAUDE.md raiz).
