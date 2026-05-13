# Design — `twygo-qa-agent`

> **Status:** Design approved 2026-05-13. Implementation plan pending (see `docs/superpowers/plans/`).

## Goal

Build a standalone agent that takes a feature input document (MD/PDF/DOCX/free-form), interactively interviews the QA for technical gaps, runs reconnaissance against the Twygo app via Playwright + Chrome DevTools MCPs, and emits three artifacts ready to seed a Playwright test project:

1. `SKILL.md` — operational knowledge skill describing the feature's canonical testing pattern (style: `interagir-switch-chakra-twygo`).
2. `ACs-canonical.md` — feature acceptance criteria normalized in canonical PT-BR prose (compatible with Twygo `prose-patterns.md`).
3. `project.config.json` — Playwright project configuration scoped to the feature (same schema used by `agent-playwright/projects/<slug>/project.config.json`).

The agent is a one-shot bootstrapper. It does **not** generate Playwright specs, run tests, produce reports, or replace `agent-playwright`. QA copies the three artifacts manually into the consuming project after review.

## Scope & Non-Scope

**In scope**
- New standalone repo at `/home/joao/Documentos/twygo/twygo-qa-agent/`, sibling of `twygo-agents-qa/`.
- Forked from `twygo-agents-qa/agent-playwright/` via `cp -r` + `git init` (no history preserved).
- 1 slash command + 8 skills (1 orchestrator + 7 sub-skills).
- Polymorphic input normalization (MD/TXT/PDF/DOCX).
- Interactive turn-by-turn Q&A inside the Claude Code session.
- Reconnaissance using `playwright-test` MCP + `chrome-devtools` MCP.
- Outputs land in `twygo-qa-agent/outputs/<feature-slug>/artifacts/`.

**Out of scope (this iteration)**
- Playwright spec generation (handled downstream by `agent-playwright` or manually).
- Test execution, healing, reporting (existing `agent-playwright` covers).
- XML/TestLink parsing (input is MD-family only).
- Multi-feature batch processing (1 feature per pipeline run).
- Posting artifacts to remote repos / opening PRs (QA copies manually).

## Architecture

### Repo Layout

```
twygo-qa-agent/
├── CLAUDE.md                                    # Consolidated conventions (no monorepo refs)
├── README.md
├── .env.example
├── package.json                                 # Trimmed deps (no orchestrator/parser/healer)
├── playwright.config.ts
├── tsconfig.json
├── .mcp.json                                    # playwright-test + chrome-devtools
├── .gitignore                                   # outputs/, .auth/, node_modules/
├── config/environment.json
├── src/
│   ├── pages/{BasePage,LoginPage,DashboardPage,SuperAdminPage}.ts
│   ├── utils/{environment,modals,helpers,logger,constants}.ts
│   └── fixtures/{custom-fixtures,test-data}.ts
├── tests/
│   ├── setup/global-setup.ts                    # storageState login
│   ├── setup/smoke.spec.ts                      # validates login + MCPs
│   ├── auth/                                    # hand-written reference
│   ├── fixtures/inputs/                         # PRD/AC/PDF/DOCX/cru samples
│   └── golden/<feature-slug>/                   # regression goldens
├── inputs/                                      # QA-provided feature docs (versioned)
├── outputs/                                     # generated (gitignored)
│   └── <feature-slug>/
│       ├── .state.json                          # phase checkpoint
│       ├── .error.log                           # only on failure
│       ├── normalized-input.md
│       ├── qa-interview-log.md
│       ├── recon-feature.md
│       └── artifacts/
│           ├── SKILL.md
│           ├── ACs-canonical.md
│           └── project.config.json
├── lib/
│   └── input-normalizer/                        # TS lib: md/pdf/docx/txt → canonical MD
└── .claude/
    ├── SETUP.md
    ├── PROJECT_BOOTSTRAP.md
    ├── prose-patterns.md                        # Inherited; PT-BR → Playwright mappings
    ├── commands.md
    ├── commands/
    │   └── feature-bootstrap.md                 # slash command
    └── skills/
        ├── twygo-feature-orchestrator/          # NEW
        ├── ler-feature-doc/                     # NEW
        ├── entrevistar-qa/                      # NEW
        ├── mapear-fluxos-recon/                 # NEW
        ├── montar-ac-canonico/                  # NEW
        ├── montar-skill-feature/                # NEW
        ├── montar-project-config/               # NEW
        ├── atualizar-mcp-playwright/            # NEW (preflight)
        ├── atualizar-agents-oficiais/           # inherited (keep for future)
        ├── configurar-ambiente/                 # inherited
        ├── interagir-switch-chakra-twygo/       # inherited gotcha
        ├── testar-toast-chakra-twygo/           # inherited gotcha
        ├── testar-filtro-drawer-twygo/          # inherited gotcha
        ├── fechar-modais-twygo/                 # inherited gotcha
        ├── debugar-smoke-login/                 # inherited diagnostic
        ├── debugar-mcp-playwright-env/          # inherited diagnostic
        └── debugar-bug-produto-stale/           # inherited diagnostic
```

### Removed from fork (vs `agent-playwright/`)

Skills: `twygo-xml-parser`, `twygo-test-orchestrator`, `twygo-recon`, `twygo-exploratory-validator`, `twygo-report-generator`, `roadmap-*`, `validar-heal-diff`, `debugar-generator-travado`, `debugar-chat-widget-hubspot`, `debugar-filename-too-long-windows`.

Agents: `playwright-test-{planner,generator,healer}.md` (declarative subagent files).

Projects: `creditos-fase-02/`, `widgets/` (entire dirs).

Other: `tests/seed.spec.ts`, `src/fixtures/exploratory-fixture.ts`, `src/utils/exploratory.ts`.

### MCPs

`.mcp.json`:
```json
{
  "mcpServers": {
    "playwright-test": { "command": "npx", "args": ["playwright", "run-test-mcp-server"] },
    "chrome-devtools": { "command": "npx", "args": ["chrome-devtools-mcp@latest"] }
  }
}
```

Both required for `mapear-fluxos-recon`. Other skills are pure file I/O + reasoning.

## Components

### Slash command `/feature-bootstrap`

`.claude/commands/feature-bootstrap.md`

**Syntax:** `/feature-bootstrap <path-to-input>` (path optional — agent asks if missing).

**Behavior:** invokes `twygo-feature-orchestrator` skill passing the input path.

### Skill 0 — `twygo-feature-orchestrator` (master coordinator)

**Responsibility:** sequence phases. No technical work — only orchestration + state persistence.

**Internal flow** (idempotent, resumable):

1. `slugify(feature-name)` → create `outputs/<slug>/` if missing.
2. **Preflight**: invoke `atualizar-mcp-playwright`. If stale and user declines → continue with warning.
3. Invoke `ler-feature-doc` → write `outputs/<slug>/normalized-input.md`.
4. Invoke `entrevistar-qa` → write `outputs/<slug>/qa-interview-log.md` + enrich `normalized-input.md`.
5. Invoke `mapear-fluxos-recon` → write `outputs/<slug>/recon-feature.md`.
6. Invoke `montar-ac-canonico` → write `outputs/<slug>/artifacts/ACs-canonical.md`.
7. Invoke `montar-skill-feature` → write `outputs/<slug>/artifacts/SKILL.md`.
8. Invoke `montar-project-config` → write `outputs/<slug>/artifacts/project.config.json`.
9. Print summary + paths for QA copy.

**Resume:** on boot, if `outputs/<slug>/.state.json` exists, ask "resume from phase X+1 or restart?".

### Skill 1 — `ler-feature-doc`

**Input:** path to polymorphic file (md/txt/pdf/docx).

**Output:** `outputs/<slug>/normalized-input.md` with sections:
- `# <Feature name>`
- `## Objetivo`
- `## Contexto/Pré-condições` (login, profile, env, URLs)
- `## ACs detectados` (`AC-01`, `AC-02`, …)
- `## Gaps detectados`
- `## Anexos`

**Logic:**
- Lib `lib/input-normalizer/` uses: `marked` (md), `pdf-parse` (pdf), `mammoth` (docx), raw read (txt).
- Detect structure heuristics: headings, AC bullet patterns, BDD (`Dado/Quando/Então`), AC tables.
- Unstructured input → classify heuristically, mark sections "inferido — confirmar no Q&A".

### Skill 2 — `entrevistar-qa`

**Input:** `outputs/<slug>/normalized-input.md`.

**Output:** `outputs/<slug>/qa-interview-log.md` (per Q/A record) + updated `normalized-input.md`.

**Behavior:**
- Read `normalized-input.md` → list gaps.
- Turn-by-turn questions (one per turn, multiple-choice when possible).
- Question categories: base URL, user profile, dependencies (org/contract/plan), known selectors, states to cover (happy/error/loading/empty), priority, edge cases, test data.
- Save each answer incrementally; update `.state.json` with `lastQuestionId`.

### Skill 3 — `mapear-fluxos-recon`

**Input:** enriched `normalized-input.md`.

**Output:** `outputs/<slug>/recon-feature.md`.

**Behavior:**
- Preflight: `atualizar-mcp-playwright` (idempotent — skip if already run this session).
- Auth: storageState (if valid) or fresh login.
- Per AC, navigate the documented path. Do not crawl blindly.
- **Playwright MCP**: capture `data-test-id` attrs, role+name, labels, placeholders, accessibility tree.
- **Chrome DevTools MCP**: console errors/warnings, network requests, detect modal/sync-alert blockers.
- Structure per flow:
  - `## Fluxo: <name>` per AC
  - Canonical URL + navigation breadcrumb
  - Table: `data-test-id | tag | role | aria-label | nota`
  - Observed behaviors (toasts, modals, redirects, loading)
  - Gotchas detected (links to inherited gotcha skills via `[[ ]]`)

### Skill 4 — `montar-ac-canonico`

**Input:** `normalized-input.md` + `qa-interview-log.md` + `recon-feature.md`.

**Output:** `outputs/<slug>/artifacts/ACs-canonical.md`.

**Per-AC format:**

```markdown
## AC-01: <título curto>

**Prioridade**: alta | média | baixa
**Tipo**: feliz | erro | bloqueio | edge

### Pré-condições
- Usuário logado como <perfil>
- <pré-condição domínio>

### Cenário (PT-BR canonical)
**Dado** que estou em <URL/local>
**Quando** clico em `<elemento canonical do recon>`
**Então** vejo `<elemento de saída do recon>`

### Seletores referenciados
- `getByTestId('<id>')` — fonte: recon
- `getByRole('button', { name: '<nome>' })` — fonte: recon

### Gotchas aplicáveis
- [[interagir-switch-chakra-twygo]]
- [[testar-toast-chakra-twygo]]
```

**Validations before write:**
- Each AC references ≥1 selector that exists in recon (no fabrication).
- Prose follows `.claude/prose-patterns.md` mappings.

### Skill 5 — `montar-skill-feature`

**Input:** `recon-feature.md` + `ACs-canonical.md`.

**Output:** `outputs/<slug>/artifacts/SKILL.md`.

**Template:**

```markdown
---
name: testar-<feature-slug>-twygo
description: <quando usar — sintoma+contexto, 1 parágrafo>
---

# Testar <Feature>

## Sintoma de aplicação
<Quando QA vai precisar dessa skill — feature, fluxo>

## Padrão canônico
<Seletores chave, ordem de interação, sync points>

## Anti-patterns
<Gotchas detectados no recon>

## Exemplo
<Snippet de spec/POM mínimo baseado em seletores reais do recon>

## Referências
- [[ACs-canonical-<slug>]]
- [[recon-feature-<slug>]]
- Gotchas relacionados: [[interagir-switch-chakra-twygo]] (etc)
```

### Skill 6 — `montar-project-config`

**Input:** `normalized-input.md` (env) + `recon-feature.md` (base URL).

**Output:** `outputs/<slug>/artifacts/project.config.json`.

**Schema** (mirrors existing `agent-playwright/projects/<slug>/project.config.json`):

```json
{
  "projectName": "<feature-slug>",
  "testAnalysisFile": "",
  "environment": "<env>",
  "reporting": { "outputDir": "outputs/<slug>/reports" },
  "exploratory": { "...": "..." }
}
```

Validated against zod schema before write.

### Skill 7 — `atualizar-mcp-playwright`

**Responsibility:** ensure `playwright-test` MCP is current before recon.

**Behavior:**
- Read current version from `.mcp.json` (or `package-lock.json`).
- Run `npm view @playwright/mcp version` (or equivalent — confirm exact package at implementation time).
- If versions differ → propose `npm install @playwright/mcp@latest` and wait for user approval.
- Analog of inherited `atualizar-agents-oficiais`.
- Callable manually or as orchestrator preflight.

## Data Flow

```
/feature-bootstrap <input>
  ↓
[preflight] atualizar-mcp-playwright → version check (+ optional update)
  ↓
[phase-1] ler-feature-doc → outputs/<slug>/normalized-input.md
  ↓
[phase-2] entrevistar-qa → qa-interview-log.md + enriched normalized-input.md
  ↓
[phase-3] mapear-fluxos-recon → recon-feature.md
  ↓
[phase-4] montar-ac-canonico → artifacts/ACs-canonical.md
  ↓
[phase-5] montar-skill-feature → artifacts/SKILL.md
  ↓
[phase-6] montar-project-config → artifacts/project.config.json
  ↓
[done] print summary + paths
```

### State management

`outputs/<slug>/.state.json`:
```json
{ "lastPhase": "phase-3", "completedAt": "2026-05-13T...", "version": 1 }
```

Each skill updates `.state.json` on completion. Orchestrator checks on boot for resume.

### Source-of-truth per artifact

| Artifact | Primary source | Secondary source |
|---|---|---|
| `ACs-canonical.md` | `normalized-input.md` + `qa-interview-log.md` | `recon-feature.md` (selectors) |
| `SKILL.md` | `recon-feature.md` (patterns + gotchas) | `ACs-canonical.md` (scenarios) |
| `project.config.json` | `normalized-input.md` (env + slug) | `recon-feature.md` (baseURL) |

### Idempotency

- Phases 1–3 may rerun (overwrite checkpoint after QA confirmation).
- Phases 4–6 are pure (same inputs → same outputs).
- Preflight MCP only updates with explicit approval.

## Error Handling

### 1. Input invalid (`ler-feature-doc`)
- Path missing → abort, ask for correct path via Q&A.
- Unsupported format → list accepted (`.md/.txt/.pdf/.docx`), abort.
- Empty/unstructured MD → emit `normalized-input.md` with only `## Gaps detectados` populated; phase 2 covers gaps.
- Corrupted PDF/DOCX → capture lib exception, show message, ask QA to fix source.

### 2. Q&A interrupted (`entrevistar-qa`)
- Incremental save per answer in `qa-interview-log.md` + `.state.json.lastQuestionId`.
- Session ends mid-loop → resume reads `lastQuestionId` and continues.
- QA answers "não sei" → AC tagged `INCOMPLETO — recon tentará inferir`.

### 3. Auth/login fails (`mapear-fluxos-recon`)
- Corrupted/expired storageState → invoke `debugar-smoke-login`. Re-login via global-setup.
- Missing .env creds → point to `configurar-ambiente`, abort.
- App unreachable (LoginPage timeout) → abort with clear message; suggest checking VPN/env.

### 4. MCP unavailable (`mapear-fluxos-recon`)
- `playwright-test` MCP unresponsive → invoke `debugar-mcp-playwright-env`. If persists, abort phase 3, persist state, instruct QA to restart session.
- `chrome-devtools` MCP offline → degrade: skip console/network capture, mark recon header `[DEGRADED: chrome-dev offline]`, phases 4–6 continue.

### 5. Partial recon (`mapear-fluxos-recon`)
- URL inaccessible → entry `## Fluxo: <AC> [BLOQUEADO: <motivo>]`, continue.
- Promised element not in DOM → record under `## Discrepâncias` (name + source + status "não encontrado"). Phase 4 marks AC as needs-review.
- Sync alert / modal blocker → invoke `fechar-modais-twygo`, retry.

### 6. Canonical AC validation fails (`montar-ac-canonico`)
- AC references selector not in recon → emit AC with `### ⚠ Seletores não encontrados` section; propose to QA: (a) rerun focused recon, (b) mark AC infeasible, (c) adjust AC. Pause pipeline.
- AC prose violates `prose-patterns.md` → attempt auto-normalize via mapping lookup. If fails, leave raw + inline warning.

### 7. Output already exists (`montar-skill-feature`, `montar-project-config`)
- `outputs/<slug>/artifacts/<file>` exists → prompt QA: overwrite, diff (display), or abort.

### 8. Preflight MCP version (`atualizar-mcp-playwright`)
- `npm view` fails (registry offline) → assume current, continue with warning `[NOTE: MCP version check skipped - offline]` in artifact headers.
- User declines update → continue with current version; record in log.

### 9. Unrecoverable generic error
- Unhandled exception → orchestrator captures, writes `outputs/<slug>/.error.log` with stack + state + phase, persists partial `.state.json`, prints error summary + log path.

### Conventions
- No `--no-verify` / no silent skip — every degradation logs in affected artifact header.
- `.state.json` only updates after skill confirms completion.
- Re-running phase X with valid checkpoint overwrites only that phase's output.
- All user-facing messages in PT-BR (Twygo convention).

## Testing Strategy

Repo emits artifacts (MD/JSON). It does not run Playwright as product. Tests cover the skills + normalizer lib, not the Twygo feature.

### Layers

**1. Unit — input normalizer (`lib/input-normalizer/`)**
- Framework: Vitest.
- Targets: MD parser, PDF parser, DOCX parser, structure classifier (heading/AC-list/BDD), gap detector.
- Fixtures in `tests/fixtures/inputs/`: `feature-prd-completo.md`, `feature-ac-list-cru.md`, `feature-bdd-gherkin.md`, `feature-pdf-completo.pdf`, `feature-docx-completo.docx`, `feature-vazio.md`, `feature-malformado.txt`.
- Asserts: snapshot `normalized-input.md` per fixture.

**2. Unit — artifact emitters (`montar-ac-canonico`, `montar-skill-feature`, `montar-project-config`)**
- Inputs: synthetic `normalized-input.md` + `qa-interview-log.md` + `recon-feature.md` mocks.
- Asserts:
  - `ACs-canonical.md`: prose valid vs `prose-patterns.md`, each selector exists in recon mock.
  - `SKILL.md`: frontmatter valid, all required sections present, `[[ref]]` links resolve.
  - `project.config.json`: schema valid (zod).

**3. Integration — orchestrator E2E (MCPs mocked)**
- Vitest + MCP-call stubs.
- Golden-path scenario: full input + scripted Q&A + mocked recon → expected 3 artifacts.
- Error scenarios: partial recon (URL blocked), chrome-dev offline (degraded), QA answers "não sei" everywhere.
- Asserts: artifacts contain correct degradation markers; `.state.json` reflects correct phase.

**4. Smoke — real environment**
- `tests/setup/smoke.spec.ts` (Playwright): Twygo login + MCPs healthy. Same pattern as inherited.
- `npm run agent:smoke` before first pipeline run.

**5. Regression goldens (qualitative)**
- `tests/golden/<feature-slug>/` with inputs + expected outputs from real bootstrapped features.
- `npm run agent:regression` reruns pipeline in `--dry-run` (no MCP, uses serialized recon) and diffs vs goldens.
- CI trigger: PR touching emitter skills → regression auto-runs.

### Not tested (intentional)

- Inherited gotcha skills — validated in `agent-playwright` origin; read-only in fork.
- Human Q&A flow — covered by dogfooding on real features.
- Live recon (real MCP, real app) — not CI-runnable; covered by smoke + manual.

### Quality metrics

- Normalizer lib coverage ≥80% lines/branches.
- Emitters coverage ≥70% (templates are mechanical).
- Smoke run <60s.
- E2E pipeline (excluding human Q&A) target <10min per feature.

### Conventions

- TS strict; no `any`.
- Snapshots in `__snapshots__/` adjacent to spec.
- Fixtures versioned in git.
- No global mocks — local stubs per test.

## Open questions (for implementation phase)

1. **Exact npm package name for Playwright MCP** — `@playwright/mcp` vs current setup uses `npx playwright run-test-mcp-server`. Confirm before writing `atualizar-mcp-playwright`.
2. **`project.config.json` schema** — fork the current schema as-is from `agent-playwright/projects/widgets/project.config.json`. Decide if any fields are obsolete in the new context (e.g. `reporting.outputDir` may not apply since this repo doesn't run tests).
3. **Slugify rules** — confirm acceptable slug pattern (`kebab-case`, max length, PT-BR diacritics handling).
4. **`.claude/prose-patterns.md` portability** — copy verbatim from `agent-playwright/.claude/prose-patterns.md` or trim sections that don't apply (e.g. spec-generation specific mappings)?
5. **Smoke test scope** — minimum viable smoke for this repo: login + 1 navigation + MCP ping. Confirm exact target page.

## Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| Where new agent lives | Standalone repo at `/home/joao/Documentos/twygo/twygo-qa-agent/` | User chose new repo over monorepo sibling for clean isolation. |
| Fork method | `cp -r` + `git init` (no history) | Simpler than `filter-branch`; lineage preserved in commit message only. |
| Repo name | `twygo-qa-agent` | User-selected. |
| Input format | Polymorphic (md/txt/pdf/docx) via normalizer lib | User: "pode ser MD doc x pode ser várias coisas pode existir alguma lib para transformar tb". |
| Q&A model | Interactive turn-by-turn in Claude Code | User-selected. |
| Recon scope | Walk documented flows, map elements/ids/behaviors, validate configs | User: "percorrer fluxos a fim de mapear elementos, ids, comportamentos para revalidar criação das configs". |
| Output destination | `twygo-qa-agent/outputs/<slug>/artifacts/`, manual copy by QA | User-selected. QA reviews before propagating to downstream repos. |
| Orchestration | Slash command + orchestrator skill + 7 sub-skills | User-selected approach A. |
| Output 1 (SKILL.md) | Doc only, style `interagir-switch-chakra-twygo` | User-selected. |
| Output 2 (ACs) | MD canonicalized in PT-BR | User-selected. |
| Output 3 (config) | `project.config.json` per feature | User-selected. |
| MCP version maintenance | New skill `atualizar-mcp-playwright` | User: "n esquece de sempre deixar para atualizar o mcp do playright". |
