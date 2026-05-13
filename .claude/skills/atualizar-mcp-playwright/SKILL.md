---
name: atualizar-mcp-playwright
description: Confere se o pacote `@playwright/test` (que drives o MCP `playwright-test` via `npx playwright run-test-mcp-server`) está em versão atual e, se não, propõe `npm install @playwright/test@latest`. Idempotente dentro da sessão. Análogo de `atualizar-agents-oficiais`. Use como preflight do `twygo-feature-orchestrator` ou manualmente quando suspeitar que o MCP está desatualizado.
version: 0.1.0
---

# atualizar-mcp-playwright

## Quando usar

- Como preflight de `twygo-feature-orchestrator` (auto-invocado).
- Manualmente quando o QA suspeitar que o MCP está desatualizado (ex: changelog recente).
- Após erros do MCP que mencionem "deprecated" ou "unsupported flag".

## O que faz

1. Lê a versão atual de `@playwright/test` em `package.json` + `package-lock.json`.
2. Consulta a versão mais recente no registry: `npm view @playwright/test version`.
3. Se versões iguais → reporta "MCP atual" e sai.
4. Se diferentes → propõe ao QA:

   > Versão atual: `1.49.0`. Mais recente: `1.51.2`. Atualizar agora? (y/N)

5. Se aprovado: executa `npm install @playwright/test@latest` e roda `npm run smoke` pra validar.
6. Se recusado: continua, mas grava warning em `outputs/<slug>/.state.json.notes`.

## Idempotência

Dentro da mesma sessão Claude Code, a skill memoriza que já checou (em memória, não em disco). Re-invocações na mesma sessão são no-op.

Entre sessões, sempre re-checa.

## Degradação

Se `npm view` falhar (registry offline, proxy bloqueando):

```
⚠ Não consegui consultar npm registry. Pulando check de versão.
   Grava warning: outputs/<slug>/.state.json.notes += "[MCP version check skipped - offline]"
   Pipeline continua.
```

## Comandos

```bash
# Check
npm view @playwright/test version
node -e "console.log(require('./package.json').devDependencies['@playwright/test'])"

# Update (com aprovação)
npm install @playwright/test@latest

# Validar pós-update
npm run smoke
```

## Anti-patterns proibidos

- **Não atualize silenciosamente** — sempre pergunte ao QA.
- **Não atualize sem rodar smoke depois** — breakage de MCP precisa ser detectado imediatamente.
- **Não atualize `@playwright/test` se há test runs em andamento** (lock de processo).
- **Não confunda com `atualizar-agents-oficiais`** — aquele atualiza os subagents Markdown declarativos (planner/generator/healer); este atualiza o pacote npm que drives o MCP.

## Referências

- Skill análoga: [[atualizar-agents-oficiais]]
- Diag fallback se MCP quebrar pós-update: [[debugar-mcp-playwright-env]]
