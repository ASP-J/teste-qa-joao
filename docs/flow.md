# Fluxo do twygo-qa-agent

Reprodução do whiteboard original do produto.

```
                ┌──────────────────────────────────────────┐
                │  Perguntas sobre o fluxo de teste        │
                │                                          │
                │  ┌────────────────────────────────────┐  │
                │  │  Agente vai fazendo perguntas      │  │
                │  │  técnicas para o QA                │  │
                │  │  Específica o que ele quer testar  │  │
                │  └────────────────────────────────────┘  │
                └──────────────┬───────────────────────────┘
                               │
                               ▼
┌─────────────────┐    ┌───────────────────────────┐    │
│  Leitura do     │    │  Criar pré-documentação   │    │
│  doc/md         │───►│  dos testes e o caminho   │    │
│ (preferencial-  │    │  que vai seguir +         │    │
│  mente MD)      │    │  quebra de atividades     │    │
└─────────────────┘    └──────────────┬────────────┘    │
                                      │                  │
                       ───────────────┼───────────────  (boundary)
                                      ▼
                       ┌───────────────────────────┐
                       │  Agente lê MD e ativa     │
                       │  chrome-devtools MCP      │
                       │  (Exec)                   │
                       └──────────────┬────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────┐
                       │  Salva análises de teste  │
                       └──────────────┬────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────┐
                       │  Output da análise        │
                       │  ROBUSTA (arquivo MD)     │
                       └──────────────┬────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────┐
                       │  Monta skill, input e     │
                       │  configs para rodar       │
                       │  o Playwright             │
                       └──────────┬────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
       ┌────────────┐    ┌────────────────┐    ┌──────────────┐
       │ Skill da   │    │ Input de       │    │ Configs do   │
       │ feature    │    │ referência IA  │    │ Playwright   │
       │ (SKILL.md) │    │ (AC baseado)   │    │ (project     │
       │            │    │ (.md canon.)   │    │  .config     │
       │            │    │                │    │  .json)      │
       └────────────┘    └────────────────┘    └──────────────┘
```

## Mapeamento boxes → skills

| Box do whiteboard | Skill / Componente |
|---|---|
| Leitura do doc/md | [[ler-feature-doc]] + `lib/input-normalizer/` |
| Perguntas sobre o fluxo de teste | [[entrevistar-qa]] |
| Criar pré-documentação + quebra | output combinado de `ler-feature-doc` + `entrevistar-qa` em `outputs/<slug>/normalized-input.md` + `qa-interview-log.md` |
| Agente lê MD + ativa chrome-dev | [[mapear-fluxos-recon]] (usa `chrome-devtools` + `playwright-test` MCPs) |
| Salva análises de teste | output em `outputs/<slug>/recon-feature.md` |
| Output da análise ROBUSTA | mesmo `recon-feature.md` + agregação no `ACs-canonical.md` |
| Monta skill+input+configs | [[montar-skill-feature]], [[montar-ac-canonico]], [[montar-project-config]] |
| Skill da feature | `outputs/<slug>/artifacts/SKILL.md` |
| Input de referência IA (AC) | `outputs/<slug>/artifacts/ACs-canonical.md` |
| Configs do playwright | `outputs/<slug>/artifacts/project.config.json` |

## Fases internas com state

```
init
  │
  ▼
preflight    ← atualizar-mcp-playwright
  │
  ▼
phase-1      ← ler-feature-doc           → outputs/<slug>/normalized-input.md
  │
  ▼
phase-2      ← entrevistar-qa            → outputs/<slug>/qa-interview-log.md
  │
  ▼
phase-3      ← mapear-fluxos-recon       → outputs/<slug>/recon-feature.md
  │
  ▼
phase-4      ← montar-ac-canonico        → outputs/<slug>/artifacts/ACs-canonical.md
  │
  ▼
phase-5      ← montar-skill-feature      → outputs/<slug>/artifacts/SKILL.md
  │
  ▼
phase-6      ← montar-project-config     → outputs/<slug>/artifacts/project.config.json
  │
  ▼
done         (resumo + paths impressos)
```

Estado persistido em `outputs/<slug>/.state.json` via `lib/state/machine.ts`. Retomada suportada.

## Trigger

```
/feature-bootstrap inputs/<sua-feature>.md
```

Detalhes técnicos: [design.md](design.md). Plan original: [implementation-plan.md](implementation-plan.md).
