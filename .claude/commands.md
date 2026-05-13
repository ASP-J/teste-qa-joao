# Comandos — twygo-qa-agent

## Slash commands (Claude Code)

| Comando | O que faz |
|---|---|
| `/feature-bootstrap <path>` | Dispara `twygo-feature-orchestrator` com o input apontado |

## npm scripts

| Comando | O que faz |
|---|---|
| `npm test` | Vitest — unit tests da lib normalizer + schemas |
| `npm run test:watch` | Vitest em modo watch |
| `npm run smoke` | Playwright smoke — login + landing |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run clean` | Remove `outputs/` e cache do vitest |

## Skills invocáveis sob demanda

Todas em `.claude/skills/`. Claude Code carrega automaticamente — você invoca pelo nome ou pela trigger phrase descrita no `description` do SKILL.md.

Skills do pipeline (geralmente acionadas pelo orchestrator, raramente direto):
- `twygo-feature-orchestrator`
- `ler-feature-doc`
- `entrevistar-qa`
- `mapear-fluxos-recon`
- `montar-ac-canonico`
- `montar-skill-feature`
- `montar-project-config`
- `atualizar-mcp-playwright`

Skills de gotcha Twygo (consultadas durante recon/emission):
- `interagir-switch-chakra-twygo`
- `testar-toast-chakra-twygo`
- `testar-filtro-drawer-twygo`
- `fechar-modais-twygo`

Skills de diagnóstico (quando algo quebra):
- `debugar-smoke-login`
- `debugar-mcp-playwright-env`
- `debugar-bug-produto-stale`
- `auto-auditar-fails-via-devtools`

Skills de setup/manutenção:
- `configurar-ambiente`
- `atualizar-agents-oficiais`
