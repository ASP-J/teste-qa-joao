# Bootstrap de feature — twygo-qa-agent

Fluxo padrão pra rodar a pipeline contra uma feature nova.

## Antes de tudo

1. Smoke OK (`npm run smoke` passa) — ver [SETUP.md](SETUP.md).
2. MCPs carregados — `/mcp` no Claude Code mostra `playwright-test` e `chrome-devtools`.
3. Você tem o doc da feature em `inputs/<slug>.md` (ou `.txt`/`.pdf`/`.docx`).

## Rodar

```
/feature-bootstrap inputs/minha-feature.md
```

O agente conduz o restante. Esperado:

1. **Preflight** — versão do `@playwright/test` (drives MCP). Se desatualizado, pede aprovação pra `npm install @playwright/test@latest`.
2. **Phase 1 — Input** — normaliza o doc → `outputs/<slug>/normalized-input.md`. Você revisa.
3. **Phase 2 — Q&A** — agente faz perguntas turn-by-turn (URL, perfil, edge cases, dados). Responda direto.
4. **Phase 3 — Recon** — agente loga no Twygo + navega o app via MCPs. Não interativo. Pode levar ~5min.
5. **Phase 4-6 — Emit** — gera os 3 artefatos em `outputs/<slug>/artifacts/`.

Output final:

```
outputs/<slug>/artifacts/
├── SKILL.md
├── ACs-canonical.md
└── project.config.json
```

## Retomada

Cada fase grava checkpoint em `outputs/<slug>/.state.json`. Se a sessão Claude fechar no meio, rode o mesmo comando — agente pergunta:

> Detectei `outputs/<slug>/.state.json` com `lastPhase=phase-3`. Retomar de phase-4?

## Validar e copiar

1. Abra `outputs/<slug>/artifacts/SKILL.md` — confere se o exemplo faz sentido.
2. Abra `outputs/<slug>/artifacts/ACs-canonical.md` — confere se todos ACs têm seletores reais.
3. Copie pro repo de destino:

```bash
# Exemplo: pro agent-playwright do monorepo twygo-agents-qa
cp outputs/<slug>/artifacts/SKILL.md \
   ../twygo-agents-qa/agent-playwright/.claude/skills/testar-<slug>-twygo/SKILL.md

cp outputs/<slug>/artifacts/project.config.json \
   ../twygo-agents-qa/agent-playwright/projects/<slug>/project.config.json
```

ACs-canonical.md geralmente vira input pro planner downstream — convenção varia por repo de destino.

## Quando NÃO usar este pipeline

- Feature já tem spec Playwright escrito → não tem o que bootstrapar.
- Feature é só refactor de testes existentes → use o agent-playwright diretamente.
- Você só quer recon do app, sem doc de feature → invoca skill `mapear-fluxos-recon` direto.
