---
name: debugar-mcp-playwright-env
description: O MCP server `playwright-test` (do plugin oficial Microsoft) é spawnado uma única vez por sessão Claude Code e não re-lê `.env` nem variáveis exportadas via Bash depois disso. Em monorepo com múltiplos projetos (creditos-fase-02 + widgets), invocar `playwright-test-planner` ou `playwright-test-generator` falha com `Múltiplos projetos em projects/: ... Use --project <slug> ou export PROJECT=<slug>`. Use quando aparecer esse erro mesmo após você ter exportado `PROJECT` ou editado `.env`.
version: 1.0.0
---

# debugar-mcp-playwright-env

## Sintoma canônico

Ao chamar qualquer ferramenta do MCP `playwright-test` (ex.:
`mcp__playwright-test__generator_setup_page`,
`mcp__playwright-test__browser_navigate`):

```
Error: Failed to load config: Error: Múltiplos projetos em projects/:
creditos-fase-02, widgets. Use --project <slug> ou export PROJECT=<slug>.
```

E você JÁ:

- exportou `PROJECT=widgets` no shell
- adicionou `PROJECT=widgets` em `.env`
- passou `process.env.PROJECT` em via outro caminho

E mesmo assim **o erro persiste em chamadas subsequentes**.

## Por que acontece

O MCP server roda como **processo filho do Claude Code**. Ele é spawned na
primeira chamada a uma tool MCP da sessão (via `npx playwright run-test-mcp-server`,
conforme `.mcp.json`). Esse processo herda **apenas** as env vars existentes
no momento do spawn — não relê `.env`, não vê `export` que você fizer depois.

`playwright.config.ts` é carregado pelo MCP server in-process via dotenv
(`import 'dotenv/config'` em `src/utils/environment.ts`), mas o dotenv só
roda uma vez no boot do processo. `getProjectSlug()` resolve `process.env.PROJECT`
naquele instante; se estava unset, falha permanentemente para a sessão.

## Workaround imediato (sem reiniciar sessão)

Não recompense uma cadeia de fix com mais tempo gasto. **Pule o MCP** para
a tarefa em questão e use Playwright direto via Node API:

```ts
// .tmp-explore.mjs (apagar após uso — NÃO commit)
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  baseURL: 'https://widgets.stage.twygoead.com',
  storageState: './outputs/.auth/storage.json',  // reusa do globalSetup
  viewport: { width: 1920, height: 1080 },
});
const page = await ctx.newPage();
await page.goto('/o/36988/use_modes?tab=panels-tab');
// ... lógica de exploração via locator + evaluate
await browser.close();
```

Rodar com `node .tmp-explore.mjs`. Lê o mesmo storageState, sem MCP, sem
dependência de PROJECT no env.

Limitações:
- Sem subagent `playwright-test-planner` / `playwright-test-generator` —
  você (o agente principal) faz o trabalho deles à mão.
- Não captura no log MCP (não passa por `generator_read_log`).

## Fix definitivo (1 sessão pra frente)

Adicione `PROJECT` no `env` do MCP server em `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright-test": {
      "command": "npx",
      "args": ["playwright", "run-test-mcp-server"],
      "env": {
        "PROJECT": "widgets"
      }
    }
  }
}
```

**ATENÇÃO**: `.mcp.json` é commitado no repo, então hardcodar `widgets` faz
o agent ficar específico para esse projeto. Duas opções:

| Opção | Quando usar |
|---|---|
| **Hardcode no `.mcp.json` por branch de projeto** (ex.: `project/widgets`) | Branches `project/<slug>` que vivem semanas/meses — é razoável fixar o projeto ativo ali |
| **Não commitar `.mcp.json` com PROJECT fixo** | Branch `master` cumulativa — deixe sem `env.PROJECT` e use o workaround acima até o plugin Playwright suportar `--project` no MCP |

**Importante**: depois de editar `.mcp.json`, **encerre e reinicie a sessão
Claude Code** (mesmo erro persiste se reusar a sessão atual — MCP server
caches o spawn). Após reabrir, a primeira chamada MCP usa o `env` novo.

## Checklist de 1 minuto

1. **Confirme que é esse problema** (não outra causa):
   ```bash
   cat .mcp.json | grep -A2 playwright-test
   ```
   Se não tem campo `env`, e você acabou de exportar `PROJECT`, é
   provavelmente isso.

2. **Conferir que não é cache do dotenv**:
   ```bash
   grep '^PROJECT=' .env
   ```
   Se `.env` tem `PROJECT=` mas o MCP não o pega, é definitivamente o
   problema de spawn.

3. **Decidir**:
   - Tarefa única (recon, exploração) → workaround Node API direto.
   - Trabalho longo (uma suíte inteira de specs) → editar `.mcp.json` +
     reabrir sessão.

## Anti-patterns

- ❌ **Re-tentar a chamada MCP esperando que pegue o env atualizado.** Não
  vai pegar. Cada retry consome 1 turno de mensagem sem progresso.
- ❌ **`source .env` no Bash antes da chamada MCP.** O Bash tool isola
  shell state; mesmo assim, o MCP server já foi spawned.
- ❌ **Restartar só o Bash tool.** O MCP server está em outro processo,
  isolado do shell.
- ❌ **Commitar `.mcp.json` com `PROJECT=widgets` em master.** Quebra para
  quem trabalha em creditos-fase-02 a partir de master. Use só em branches
  `project/<slug>`.
- ❌ **Apagar e reimportar `playwright.config.ts`.** O config é parsed
  on-demand, mas `getProjectSlug` recebe o snapshot de `process.env`
  congelado no boot do MCP — re-importar config não muda.

## Por que esta skill existe

Em 2026-05-11, gastei ~25min na suíte "Pesquisa e Filtros" tentando fazer
o MCP `playwright-test` respeitar `PROJECT=widgets` via combinações de
`.env`, `export`, edição direta de `.mcp.json` sem restart. O sintoma é
enganoso — parece que o env não está sendo lido, mas na verdade está sendo
lido **uma vez só** no spawn do MCP server.

Workaround com Playwright Node API direto (40 linhas de script) cobre 90%
dos casos de exploração ad-hoc. O fix definitivo via `.mcp.json` é trivial
mas requer reabrir sessão — saber disso antes economiza a tentativa
"vou exportar e tentar de novo" que nunca funciona.

## Quando o workaround NÃO basta

Se a tarefa exige **playwright-test-planner** ou **playwright-test-generator**
subagent (com tool calls do MCP fluindo entre subagents), o workaround não
serve — você precisa do MCP funcionando. Nesse caso:

1. Edite `.mcp.json` com `env.PROJECT`.
2. Termine a sessão atual (mesmo que tenha progresso); commit o que dá.
3. Reabra sessão e rode planner/generator.

Se o usuário pediu para terminar a tarefa AGORA sem reiniciar, faça o
trabalho dos subagents à mão usando o workaround Node API + sua própria
geração de spec (modelo: olhe `projects/widgets/tests/features/listagem-de-paineis/`
para o padrão). Custo: ~1.5x mais lento que com subagents, mas viável.
