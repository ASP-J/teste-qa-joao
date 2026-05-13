---
name: ler-feature-doc
description: Lê um doc de feature em formato polimórfico (.md/.txt/.pdf/.docx) e produz `outputs/<slug>/normalized-input.md` canonicalizado com seções `# Nome`, `## Objetivo`, `## Contexto/Pré-condições`, `## ACs detectados`, `## Gaps detectados`, `## Anexos`. Detecta estrutura (PRD/AC-list/BDD), inferiu o que faltou e marca gaps. Use como fase 1 do pipeline `twygo-feature-orchestrator` ou stand-alone pra normalizar input antes do Q&A.
version: 0.1.0
---

# ler-feature-doc

## Quando usar

Phase 1 do orchestrator, ou stand-alone quando o QA quiser pré-canonicalizar um doc antes de rodar Q&A.

## Como invocar

Internamente delega pra lib `lib/input-normalizer/` (TypeScript). Execute via:

```bash
npx tsx lib/input-normalizer/cli.ts <input-path> outputs/<slug>/normalized-input.md
```

A lib aceita extensões:
- `.md` (PRD, spec, BDD) — parser `marked`
- `.txt` (AC list crua) — parser custom
- `.pdf` — `pdf-parse` → reusa MD parser
- `.docx` — `mammoth` → reusa MD parser

## Output

`outputs/<slug>/normalized-input.md`:

```markdown
# <Nome da Feature>

## Objetivo

<1 parágrafo ou _não informado — preencher no Q&A_>

## Contexto/Pré-condições

- <pré-condição>
- ...

## ACs detectados

- **AC-01**: <texto>
- **AC-02**: <texto> _(inferido)_

## Gaps detectados

- <gap>
- ...

## Anexos

- <link/ref>
```

## Heurísticas de detecção

| Sinal | Marcador |
|---|---|
| `# <título>` em line 1 | `featureName` |
| Heading `## Objetivo` + parágrafo | seção `objetivo` |
| Heading `## Pré-condições` ou `## Contexto` + lista | `contexto` |
| Heading `## ACs` ou `## Critérios` + lista `AC-NN: ...` | `acs` |
| `Feature: <nome>` em texto cru | `featureName` (TXT) |
| `Dado/Quando/Então` blocks | flag `inferred: false` (BDD) |
| Sem nenhum dos acima | `gaps += ['Nome não identificado']` etc |

## Comportamento em erro

| Caso | Comportamento |
|---|---|
| Path inexistente | Aborta com mensagem clara, pede correção via Q&A |
| Formato não-suportado (.xlsx, .docm, etc) | Lista aceitos; aborta |
| MD vazio/sem estrutura | Emite normalized com `## Gaps detectados` cheio + features inferidas; phase 2 cobre |
| PDF corrompido / DOCX inválido | Captura exception da lib, mostra mensagem, pede QA arrumar fonte |

## Onde gravar

Sempre `outputs/<slug>/normalized-input.md`. Se já existe, pergunte ao QA: sobrescrever, diff, ou abortar.

## Atualizar `.state.json`

Após gravar, advance phase pra `phase-1` via `lib/state/machine.ts` → `advancePhase(loadState(...), 'phase-1')`.

## Referências

- Lib: `lib/input-normalizer/`
- Próxima fase: [[entrevistar-qa]]
