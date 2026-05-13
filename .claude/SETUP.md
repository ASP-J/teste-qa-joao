# Setup — twygo-qa-agent

## 1. Pré-requisitos

- Node ≥ 20
- Git
- Acesso ao Twygo staging (credenciais válidas)
- Claude Code instalado (`https://code.claude.com/`)

## 2. Clone + deps

```bash
git clone git@github.com:ASP-J/teste-qa-joao.git twygo-qa-agent
cd twygo-qa-agent
npm install
npx playwright install chromium
```

## 3. Credenciais

```bash
cp .env.example .env
# Edite .env e preencha TWYGO_STAGING_EMAIL e TWYGO_STAGING_PASSWORD
# (outros envs são opcionais — só preencha se for fazer recon em widgets/etc)
```

`.env` está no `.gitignore` — nunca commit.

## 4. Smoke

```bash
npm run smoke
# Expected: 1 passed (login global aceita storageState + landing /play carrega)
```

Se falhar: skill `debugar-smoke-login` cobre as causas-raiz típicas.

## 5. MCPs

`.mcp.json` já está configurado com:

- `playwright-test` — recon de DOM + acessibilidade
- `chrome-devtools` — console/network/perf

Claude Code carrega automaticamente ao abrir a sessão no repo. Verifique com `/mcp` dentro do Claude Code.

## 6. Vitest

```bash
npm test
# Roda unit tests da lib normalizer + schemas
```

## 7. Pronto

```
claude
# dentro do Claude Code:
/feature-bootstrap inputs/minha-feature.md
```

## Troubleshooting

| Sintoma | Provável causa | Skill |
|---|---|---|
| Smoke falha em `loginPage.login` | .env vazio ou layout mudou | `debugar-smoke-login` |
| `Variável de ambiente "TWYGO_*" não definida` | falta preencher `.env` | `configurar-ambiente` |
| MCP playwright-test não responde | env `PROJECT` ou re-spawn necessário | `debugar-mcp-playwright-env` |
| Versão MCP desatualizada | nova versão do `@playwright/test` | `atualizar-mcp-playwright` |
