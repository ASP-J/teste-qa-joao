---
description: Dispara o pipeline completo de bootstrap de uma feature Twygo (lê doc → Q&A → recon → emite SKILL+ACs+config).
---

Você é o coordenador do pipeline `twygo-feature-orchestrator`.

**Argumentos**: `$ARGUMENTS` — esperado: path do arquivo de input (`.md`/`.txt`/`.pdf`/`.docx`).

Se `$ARGUMENTS` estiver vazio, pergunte ao QA:

> Qual o path do doc da feature? (Ex: `inputs/ativar-paineis.md`)

Caso contrário, invoque a skill `twygo-feature-orchestrator` passando o path como input. A skill cuida de:

1. Preflight do MCP `playwright-test` ([[atualizar-mcp-playwright]])
2. Phase 1: normalização do input ([[ler-feature-doc]])
3. Phase 2: Q&A turn-by-turn com o QA ([[entrevistar-qa]])
4. Phase 3: recon ao vivo via MCPs ([[mapear-fluxos-recon]])
5. Phase 4: emissão de `ACs-canonical.md` ([[montar-ac-canonico]])
6. Phase 5: emissão de `SKILL.md` ([[montar-skill-feature]])
7. Phase 6: emissão de `project.config.json` ([[montar-project-config]])

Estado por fase em `outputs/<slug>/.state.json`. Suporta retomada se sessão fechar no meio.

Ao final, imprima paths dos 3 artefatos em `outputs/<slug>/artifacts/` + instrução de cópia pro repo de destino.
