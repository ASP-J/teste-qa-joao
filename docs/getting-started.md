# Getting Started — twygo-qa-agent

Walkthrough end-to-end com a feature de exemplo já incluída.

## Pré-requisitos

- Node ≥ 20, Git
- Acesso ao Twygo staging
- Claude Code (`https://code.claude.com/`)
- VPN/rede se o staging exigir

## Setup (5 minutos)

```bash
git clone git@github.com:ASP-J/teste-qa-joao.git twygo-qa-agent
cd twygo-qa-agent
npm install
npx playwright install chromium
cp .env.example .env
# Edite .env e preencha:
#   TWYGO_STAGING_EMAIL=...
#   TWYGO_STAGING_PASSWORD=...
```

Valide:

```bash
npm test          # 19 unit tests do agente
npm run smoke     # login + landing Twygo
npm run typecheck # 0 erros
```

## Primeira rodada

Abra o Claude Code dentro do repo:

```bash
claude
```

Confirme MCPs:

```
/mcp
# expected: playwright-test (running), chrome-devtools (running)
```

Rode o pipeline com a feature de exemplo:

```
/feature-bootstrap inputs/ativar-paineis.example.md
```

## O que esperar (turn-by-turn)

### Turn 1 — Preflight

```
🔍 Checando versão do @playwright/test...
   Atual: 1.49.0 — Última: 1.49.0
✅ MCP atualizado.
```

### Turn 2 — Phase 1 (input)

```
📄 Lendo inputs/ativar-paineis.example.md...
✅ Normalizado em outputs/ativar-paineis/normalized-input.md.
   Detectados: 3 ACs, 2 pré-condições.
   Gaps: 0.

Quer revisar o normalized-input antes de seguir? (y/N)
```

### Turn 3-N — Phase 2 (Q&A)

```
❓ Categoria: URL/Env
   Qual env esse teste roda?
   A) staging (stage10 — orgId 36602)
   B) staging-widgets (widgets.stage — orgId 36988)
   C) outro (especifique)
```

Você responde "B". Próxima pergunta...

```
❓ Categoria: Perfil
   Qual perfil de usuário?
   A) Master  B) Admin  C) Comum
```

Continua até cobrir 8 categorias. Sem perguntas redundantes — pula o que já está no normalized-input.

### Turn N+1 — Phase 3 (Recon)

```
🌐 Iniciando recon. Storage fresh — pulando login.
   Navegando /o/36988/widgets/paineis...
   📸 DOM snapshot (12 test-ids, 8 roles)
   📡 Console: limpo
   📡 Network: 4 requests relevantes
   ⚠️  Gotcha detectado: switch Chakra em "Ativar painel" — anti-pattern aplicável.
   Navegando próximo AC...
✅ outputs/ativar-paineis/recon-feature.md gravado.
```

### Turn N+2 — Phase 4-6 (Emit)

```
📝 Montando ACs-canonical.md... 3 ACs canonicalizados, 0 warnings.
📝 Montando SKILL.md... testar-ativar-paineis-twygo gerada.
📝 Montando project.config.json... schema validado.

✅ Bootstrap completo: ativar-paineis

Artefatos em outputs/ativar-paineis/artifacts/:
  - SKILL.md            (87 linhas)
  - ACs-canonical.md    (3 ACs)
  - project.config.json (12 campos)

Próximo passo (copy-paste sugerido):
  cp outputs/ativar-paineis/artifacts/SKILL.md ../twygo-agents-qa/agent-playwright/.claude/skills/testar-ativar-paineis-twygo/SKILL.md
  cp outputs/ativar-paineis/artifacts/project.config.json ../twygo-agents-qa/agent-playwright/projects/ativar-paineis/project.config.json
```

## Verificar

```bash
ls outputs/ativar-paineis/artifacts/
# Esperado: ACs-canonical.md, SKILL.md, project.config.json

cat outputs/ativar-paineis/.state.json
# Esperado: {"lastPhase":"done","completedAt":"...","version":1}
```

## Retomar pipeline interrompido

Se sessão Claude fechar no meio, rode o mesmo comando:

```
/feature-bootstrap inputs/ativar-paineis.example.md
```

Agente detecta `outputs/ativar-paineis/.state.json` e pergunta:

```
Detectei state em outputs/ativar-paineis/.state.json (lastPhase=phase-3).
Retomar de phase-4 ou recomeçar?
```

## Próximos features

Crie um novo doc em `inputs/`:

```bash
cp inputs/ativar-paineis.example.md inputs/minha-feature.md
# edite com seu conteúdo
```

Rode:

```
/feature-bootstrap inputs/minha-feature.md
```

Slug é derivado do basename: `minha-feature`.

## Troubleshooting

| Sintoma | Skill |
|---|---|
| Smoke falha em login | [[debugar-smoke-login]] |
| `Variável de ambiente "TWYGO_*" não definida` | [[configurar-ambiente]] |
| MCP playwright-test não responde | [[debugar-mcp-playwright-env]] |
| Recon mostra modal NPS bloqueando | [[fechar-modais-twygo]] já roda em segundo plano — se falhar, abra issue |
| Output diferente do esperado | revise `outputs/<slug>/qa-interview-log.md` — pode ter respondido errado em algum turn |
