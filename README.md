# twygo-qa-agent

Bootstrapper de features de QA para a plataforma Twygo. Você fornece um documento de feature (MD/PDF/DOCX/TXT), o agente entrevista você sobre o que falta, faz recon do app via MCPs (`playwright-test` + `chrome-devtools`) e emite 3 artefatos prontos pra alimentar a geração de testes:

1. **`SKILL.md`** — skill operacional com o padrão canônico de teste daquela feature
2. **`ACs-canonical.md`** — ACs em prosa PT-BR canonicalizada
3. **`project.config.json`** — configuração de projeto Playwright escopada à feature

Não roda specs nem gera testes finais — só o material upstream.

## Setup rápido

```bash
git clone git@github.com:ASP-J/teste-qa-joao.git twygo-qa-agent
cd twygo-qa-agent
cp .env.example .env
# preencher TWYGO_STAGING_EMAIL / TWYGO_STAGING_PASSWORD em .env
npm install
npx playwright install chromium
npm run smoke   # valida login + landing
```

Detalhes em [.claude/SETUP.md](.claude/SETUP.md).

## Como usar

Abra o Claude Code dentro do repo e rode:

```
/feature-bootstrap inputs/<sua-feature>.md
```

O agente vai:
1. Conferir versão do `playwright-test` MCP (preflight).
2. Ler o doc → emitir `outputs/<slug>/normalized-input.md`.
3. Entrevistar você (turn-by-turn) pra preencher gaps.
4. Logar no Twygo + navegar o app via MCPs pra mapear elementos/comportamentos → `recon-feature.md`.
5. Emitir os 3 artefatos em `outputs/<slug>/artifacts/`.

Cada fase grava checkpoint em `.state.json`. Se o Claude Code fechar no meio, rode o mesmo comando novamente — ele pergunta se quer retomar.

## Inputs aceitos

- `.md` (PRD, spec, BDD)
- `.txt` (AC list crua)
- `.pdf`
- `.docx`

Estrutura ideal:

```markdown
# Nome da Feature

## Objetivo
...

## Pré-condições
- Usuário logado como ...

## ACs
- AC-01: ...
- AC-02: ...
```

Inputs sem estrutura formal funcionam — o Q&A cobre os gaps.

## Outputs

Tudo em `outputs/<slug>/`:

| Arquivo | Quem gera | Pra que serve |
|---|---|---|
| `normalized-input.md` | `ler-feature-doc` | input canonicalizado |
| `qa-interview-log.md` | `entrevistar-qa` | trilha de auditoria do Q&A |
| `recon-feature.md` | `mapear-fluxos-recon` | seletores+behaviors capturados ao vivo |
| `artifacts/SKILL.md` | `montar-skill-feature` | pronto pra colar em `.claude/skills/` |
| `artifacts/ACs-canonical.md` | `montar-ac-canonico` | pronto pro planner downstream |
| `artifacts/project.config.json` | `montar-project-config` | pronto pra colar em `projects/<slug>/` |

`outputs/` é gitignored. Quando ficar feliz, copie os artefatos pro repo de consumo (`twygo-agents-qa/agent-playwright/` ou onde for).

## Arquitetura

Detalhes técnicos em [CLAUDE.md](CLAUDE.md).

## Skills inherited do agent-playwright

Conhecimento operacional Twygo (gotchas, diagnósticos) — `interagir-switch-chakra-twygo`, `testar-toast-chakra-twygo`, `fechar-modais-twygo`, `debugar-smoke-login`, etc. Listadas em `.claude/skills/`.

## Suporte

- Bug no agente: issue neste repo
- Bug do produto Twygo descoberto durante recon: report normal pro time Twygo
