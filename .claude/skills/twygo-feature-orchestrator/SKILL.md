---
name: twygo-feature-orchestrator
description: Orquestra o pipeline de bootstrap de uma feature Twygo do início ao fim. Coordena 7 sub-skills em sequência (preflight MCP → ler doc → Q&A → recon → emitir 3 artefatos), persiste estado por fase em `outputs/<slug>/.state.json` pra suportar retomada. Use quando o usuário invocar `/feature-bootstrap <path>` ou pedir explicitamente "rodar o bootstrap da feature X". NÃO use pra rodar specs ou gerar testes — só pro material upstream.
version: 0.1.0
---

# twygo-feature-orchestrator

## Quando usar

Sempre que o QA invocar `/feature-bootstrap <path-to-input>` ou pedir pra rodar o pipeline completo a partir de um doc de feature.

## Pré-condições

- Smoke OK (`npm run smoke` passa)
- MCPs `playwright-test` e `chrome-devtools` carregados
- Input em `inputs/<slug>.{md,txt,pdf,docx}`

## Fluxo de fases

| Fase | Skill | Output |
|---|---|---|
| preflight | `atualizar-mcp-playwright` | (nenhum — só side-effect de check/update) |
| phase-1 | `ler-feature-doc` | `outputs/<slug>/normalized-input.md` |
| phase-2 | `entrevistar-qa` | `outputs/<slug>/qa-interview-log.md` + enriches normalized-input |
| phase-3 | `mapear-fluxos-recon` | `outputs/<slug>/recon-feature.md` |
| phase-4 | `montar-ac-canonico` | `outputs/<slug>/artifacts/ACs-canonical.md` |
| phase-5 | `montar-skill-feature` | `outputs/<slug>/artifacts/SKILL.md` |
| phase-6 | `montar-project-config` | `outputs/<slug>/artifacts/project.config.json` |

## Slug

Derive de `<basename do input>` ou do `# título` (case-1) do doc, lowercased + kebab-case + diacríticos removidos. Exemplos:
- `inputs/Ativar Painéis.md` → slug `ativar-paineis`
- `inputs/auth_recover.txt` → slug `auth-recover`

Diretório de trabalho: `outputs/<slug>/`. Crie se não existir.

## State

`outputs/<slug>/.state.json`:

```json
{
  "lastPhase": "phase-3",
  "completedAt": "2026-05-13T18:30:00Z",
  "version": 1,
  "notes": ""
}
```

Use a lib `lib/state/machine.ts` (`loadState`, `saveState`, `advancePhase`). Cada sub-skill ao concluir chama `advancePhase` e persiste.

## Retomada

No boot do orchestrator:

1. Se `outputs/<slug>/.state.json` não existe → começa do preflight.
2. Se existe e `lastPhase === 'done'` → pergunta: "Pipeline já completo. Re-rodar do zero? (apaga outputs anteriores)".
3. Se existe e `lastPhase < 'done'` → pergunta: "Retomar de `<próxima-fase>` ou recomeçar?".

## Execução fase-a-fase

Para cada fase, no Claude Code:

```
Invoque a skill `<nome-da-fase>` com slug=<slug>.
```

Espere conclusão (skill grava artefato + retorna). Atualize state. Avance.

Se uma fase falhar:
1. Persiste estado parcial.
2. Grava `outputs/<slug>/.error.log` com stack + fase.
3. Aborta sem avançar.
4. Reporta ao QA: causa + path do log + como retomar.

## Resumo final

Ao concluir phase-6, imprima:

```
✅ Bootstrap completo: <slug>

Artefatos em outputs/<slug>/artifacts/:
  - SKILL.md            (X linhas)
  - ACs-canonical.md    (N ACs)
  - project.config.json

Próximo passo (copy-paste sugerido):
  cp outputs/<slug>/artifacts/SKILL.md ../twygo-agents-qa/agent-playwright/.claude/skills/testar-<slug>-twygo/SKILL.md
  cp outputs/<slug>/artifacts/project.config.json ../twygo-agents-qa/agent-playwright/projects/<slug>/project.config.json
```

## Erros + degradações documentadas

- Preflight MCP offline → segue com warning no header dos artefatos `[NOTE: MCP version check skipped]`.
- Phase 3 com `chrome-devtools` MCP offline → segue só com `playwright-test`; marca recon como `[DEGRADED: chrome-dev offline]`.
- AC referencia seletor inexistente no recon → fase 4 emite AC com `### ⚠ Seletores não encontrados` e pausa pra decisão do QA (re-rodar recon? marcar inviável? ajustar AC?).
- Output existe → pergunta antes de sobrescrever.

## Anti-patterns proibidos no próprio orchestrator

- Nunca chame sub-skills "no escuro" — sempre confirme estado primeiro.
- Nunca avance fase sem persistir state.
- Nunca produza artefato final se a fase predecessora falhou.
- Nunca "infira" Q&A respostas — sempre pergunte ao QA real.

## Referências

- [[ler-feature-doc]]
- [[entrevistar-qa]]
- [[mapear-fluxos-recon]]
- [[montar-ac-canonico]]
- [[montar-skill-feature]]
- [[montar-project-config]]
- [[atualizar-mcp-playwright]]
