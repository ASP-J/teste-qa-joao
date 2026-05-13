# `twygo-qa-agent` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `twygo-qa-agent` repo from a forked & pruned copy of `agent-playwright`, add 8 new skills + 1 slash command + a polymorphic input-normalizer lib, push to GitHub.

**Architecture:** Standalone Node/TypeScript repo at `/home/joao/Documentos/twygo/twygo-qa-agent/`. One slash command `/feature-bootstrap` triggers `twygo-feature-orchestrator` skill, which sequences 7 sub-skills (input normalization → QA interview → recon via MCPs → emit 3 artifacts: SKILL.md, ACs-canonical.md, project.config.json). Outputs land in `outputs/<feature-slug>/artifacts/`.

**Tech Stack:** TypeScript (strict), Vitest, Playwright (kept for smoke + recon MCPs), `playwright-test` MCP, `chrome-devtools` MCP, `marked` (md), `pdf-parse` (pdf), `mammoth` (docx), `zod` (schemas).

**Reference spec:** `docs/superpowers/specs/2026-05-13-twygo-qa-agent-design.md`.

**Remote:** `git@github.com:ASP-J/teste-qa-joao.git` (branch `main`).

---

## Phase A — Fork bootstrap

### Task 1: Copy agent-playwright → twygo-qa-agent

**Files:**
- Create: `/home/joao/Documentos/twygo/twygo-qa-agent/` (full tree copy)

- [ ] **Step 1: Copy directory**

```bash
cp -r /home/joao/Documentos/twygo/twygo-agents-qa/agent-playwright /home/joao/Documentos/twygo/twygo-qa-agent
```

- [ ] **Step 2: Remove inherited .git (if any) and outputs**

```bash
cd /home/joao/Documentos/twygo/twygo-qa-agent
rm -rf .git outputs node_modules
```

- [ ] **Step 3: Verify structure**

```bash
ls /home/joao/Documentos/twygo/twygo-qa-agent
# Expected: CLAUDE.md, README.md, package.json, playwright.config.ts, .mcp.json, src/, tests/, projects/, .claude/, etc.
```

### Task 2: Prune unused skills & files

**Files to delete:**
- `.claude/skills/twygo-xml-parser/`
- `.claude/skills/twygo-test-orchestrator/`
- `.claude/skills/twygo-recon/`
- `.claude/skills/twygo-exploratory-validator/`
- `.claude/skills/twygo-report-generator/`
- `.claude/skills/twygo-triage-report/`
- `.claude/skills/roadmap-agent-metrics/`
- `.claude/skills/roadmap-recon-cache/`
- `.claude/skills/validar-heal-diff/`
- `.claude/skills/debugar-generator-travado/`
- `.claude/skills/debugar-chat-widget-hubspot/`
- `.claude/skills/debugar-filename-too-long-windows/`
- `.claude/skills/debugar-via-network-e-console/`
- `.claude/skills/comparar-chrome-mcp-vs-playwright/`
- `.claude/skills/criar-spec-resiliente-twygo/`
- `.claude/skills/webapp-testing/`
- `.claude/agents/playwright-test-planner.md`
- `.claude/agents/playwright-test-generator.md`
- `.claude/agents/playwright-test-healer.md`
- `projects/creditos-fase-02/`
- `projects/widgets/`
- `tests/seed.spec.ts`
- `src/fixtures/exploratory-fixture.ts`
- `src/utils/exploratory.ts`

- [ ] **Step 1: Delete in one shot**

```bash
cd /home/joao/Documentos/twygo/twygo-qa-agent
rm -rf \
  .claude/skills/twygo-xml-parser \
  .claude/skills/twygo-test-orchestrator \
  .claude/skills/twygo-recon \
  .claude/skills/twygo-exploratory-validator \
  .claude/skills/twygo-report-generator \
  .claude/skills/twygo-triage-report \
  .claude/skills/roadmap-agent-metrics \
  .claude/skills/roadmap-recon-cache \
  .claude/skills/validar-heal-diff \
  .claude/skills/debugar-generator-travado \
  .claude/skills/debugar-chat-widget-hubspot \
  .claude/skills/debugar-filename-too-long-windows \
  .claude/skills/debugar-via-network-e-console \
  .claude/skills/comparar-chrome-mcp-vs-playwright \
  .claude/skills/criar-spec-resiliente-twygo \
  .claude/skills/webapp-testing \
  .claude/agents/playwright-test-planner.md \
  .claude/agents/playwright-test-generator.md \
  .claude/agents/playwright-test-healer.md \
  projects/creditos-fase-02 \
  projects/widgets \
  tests/seed.spec.ts \
  src/fixtures/exploratory-fixture.ts \
  src/utils/exploratory.ts
```

- [ ] **Step 2: Verify remaining skills**

```bash
ls .claude/skills
# Expected: atualizar-agents-oficiais, configurar-ambiente, debugar-bug-produto-stale,
#   debugar-mcp-playwright-env, debugar-smoke-login, fechar-modais-twygo,
#   interagir-switch-chakra-twygo, testar-filtro-drawer-twygo, testar-toast-chakra-twygo
```

### Task 3: Adapt package.json

**Files:**
- Modify: `/home/joao/Documentos/twygo/twygo-qa-agent/package.json`

Replace scripts (remove xml/orchestrator/etc; add new agent scripts + vitest), trim deps (remove `fast-xml-parser`, `allure-*`, `@axe-core/playwright`; add `marked`, `pdf-parse`, `mammoth`, `zod`, `vitest`).

- [ ] **Step 1: Write new package.json**

```json
{
  "name": "twygo-qa-agent",
  "version": "0.1.0",
  "description": "Bootstrapper de features QA Twygo — lê doc, entrevista QA, recon via MCPs e emite SKILL.md + ACs canônicos + project.config.json.",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "smoke": "playwright test tests/setup/smoke.spec.ts",
    "typecheck": "tsc --noEmit",
    "lint:fixme": "tsx scripts/check-fixmes.ts",
    "clean": "rimraf outputs node_modules/.vite"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.10.0",
    "dotenv": "^17.4.2",
    "marked": "^14.1.0",
    "mammoth": "^1.8.0",
    "pdf-parse": "^1.1.1",
    "rimraf": "^6.0.1",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "zod": "^3.23.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Task 4: Adapt playwright.config.ts

**Files:**
- Modify: `/home/joao/Documentos/twygo/twygo-qa-agent/playwright.config.ts`

Trim: drop `allure-playwright`, drop project-list logic, keep storageState + testIdAttribute + globalSetup.

- [ ] **Step 1: Rewrite minimal config**

```typescript
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/setup/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.TWYGO_BASE_URL,
    testIdAttribute: 'data-test-id',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: 'outputs/.auth/storage.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

### Task 5: Adapt CLAUDE.md (consolidated, no monorepo refs)

**Files:**
- Modify: `/home/joao/Documentos/twygo/twygo-qa-agent/CLAUDE.md`

Replace agent-playwright CLAUDE.md with consolidated version covering: purpose (feature bootstrapper), test-id convention, MCP usage, Twygo gotchas index, skill-creation rules (inline from monorepo CLAUDE.md), prose-patterns reference.

- [ ] **Step 1: Write CLAUDE.md** (see Task body in implementation — full text written during execution; preserves §7.5 gotchas + §7.6 anti-patterns A/B/C/D/E/F from agent-playwright, removes XML/orchestrator/healer mentions, replaces monorepo skill-creation rules with same rules scoped to this repo)

### Task 6: Adapt README.md

**Files:**
- Modify: `/home/joao/Documentos/twygo/twygo-qa-agent/README.md`

Single-purpose README for the new bootstrap agent. ~150 lines max.

### Task 7: Adapt SETUP.md & PROJECT_BOOTSTRAP.md

**Files:**
- Modify: `.claude/SETUP.md` (only mention installable deps + chromium download + MCPs)
- Modify: `.claude/PROJECT_BOOTSTRAP.md` (new flow: feed input MD → run `/feature-bootstrap`)

### Task 8: Adapt .gitignore

**Files:**
- Modify: `/home/joao/Documentos/twygo/twygo-qa-agent/.gitignore`

Ensure: `outputs/`, `node_modules/`, `.env`, `.auth/`, `playwright-report/`, `test-results/`.

### Task 9: Initial git commit

- [ ] **Step 1: Init + first commit**

```bash
cd /home/joao/Documentos/twygo/twygo-qa-agent
git init -b main
git add -A
git commit -m "chore: bootstrap twygo-qa-agent (fork enxuto de agent-playwright)"
```

---

## Phase B — Skills (markdown only)

Each skill is a `SKILL.md` under `.claude/skills/<skill-name>/SKILL.md`. No executable scripts — these are prompts the agent reads. Commit one at a time.

### Task 10: `twygo-feature-orchestrator/SKILL.md`

**Files:**
- Create: `.claude/skills/twygo-feature-orchestrator/SKILL.md`

Frontmatter `name: twygo-feature-orchestrator`, description (what + when), version `0.1.0`.

Body covers: phases (preflight → ler-feature-doc → entrevistar-qa → mapear-fluxos-recon → montar-ac-canonico → montar-skill-feature → montar-project-config), state file format (`outputs/<slug>/.state.json`), resume rules, error escalation, summary print at end.

### Task 11: `ler-feature-doc/SKILL.md`

Describe: accept polymorphic input, call normalizer lib via `tsx lib/input-normalizer/cli.ts <path>`, write `normalized-input.md`. Section structure documented.

### Task 12: `entrevistar-qa/SKILL.md`

Describe: read gaps from normalized-input, ask one question per turn using multiple-choice when possible, save `qa-interview-log.md` incrementally, update `normalized-input.md` enriched on conclusion. Categories: URL/perfil/dependências/seletores/estados/prioridade/edge cases/dados.

### Task 13: `mapear-fluxos-recon/SKILL.md`

Describe: preflight `atualizar-mcp-playwright`, use storageState (or fresh login), navigate per AC, dump table via Playwright MCP, capture console/network/a11y via chrome-devtools MCP, emit `recon-feature.md`. Output structure documented. Mention degradation modes (URL blocked, chrome-dev offline).

### Task 14: `montar-ac-canonico/SKILL.md`

Describe: read 3 sources (normalized + qa-log + recon), emit `artifacts/ACs-canonical.md` per template. Validation: every selector exists in recon (else mark `⚠ Seletores não encontrados`); prose follows `prose-patterns.md`.

### Task 15: `montar-skill-feature/SKILL.md`

Describe: read recon + ACs-canonical, emit `artifacts/SKILL.md` following template (frontmatter + when-to-use + canonical pattern + anti-patterns + example + refs).

### Task 16: `montar-project-config/SKILL.md`

Describe: read normalized-input (env) + recon (baseURL), emit `artifacts/project.config.json`. Schema mirrors `agent-playwright/projects/widgets/project.config.json` minus exploratory probes (this repo doesn't run specs).

### Task 17: `atualizar-mcp-playwright/SKILL.md`

Describe: check `@playwright/test` version (drives the `playwright-test` MCP via `npx playwright run-test-mcp-server`), if newer available propose `npm install @playwright/test@latest`, callable manually or as orchestrator preflight, idempotent within session.

### Task 18: Commit skills

```bash
git add .claude/skills/
git commit -m "feat(skills): twygo-feature-orchestrator + 7 sub-skills"
```

---

## Phase C — Slash command

### Task 19: `/feature-bootstrap` command

**Files:**
- Create: `.claude/commands/feature-bootstrap.md`

Frontmatter (none — commands are markdown body); body says: "Invoque a skill `twygo-feature-orchestrator` passando `$ARGUMENTS` (path do input). Se sem argumento, pergunte ao QA."

```bash
git add .claude/commands/
git commit -m "feat(command): /feature-bootstrap"
```

---

## Phase D — Normalizer lib (TDD)

### Task 20: Vitest config + lib skeleton

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/input-normalizer/index.ts` (placeholder export)
- Create: `lib/input-normalizer/types.ts`

- [ ] **Step 1: vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: types.ts**

```typescript
export type SourceFormat = 'md' | 'txt' | 'pdf' | 'docx'

export interface RawInput {
  format: SourceFormat
  rawText: string
  sourcePath: string
}

export interface NormalizedInput {
  featureName: string
  objetivo: string | null
  contexto: string[]
  acs: AcCandidate[]
  gaps: string[]
  anexos: string[]
}

export interface AcCandidate {
  id: string
  raw: string
  inferred: boolean
}
```

- [ ] **Step 3: install deps + commit skeleton**

```bash
cd /home/joao/Documentos/twygo/twygo-qa-agent
npm install
git add package-lock.json vitest.config.ts lib/
git commit -m "chore: vitest + normalizer lib skeleton"
```

### Task 21: TDD — MD parser

**Files:**
- Create: `lib/input-normalizer/parsers/md.ts`
- Create: `lib/input-normalizer/parsers/md.test.ts`
- Create: `tests/fixtures/inputs/feature-prd-completo.md`

- [ ] **Step 1: Fixture**

`tests/fixtures/inputs/feature-prd-completo.md`:

```markdown
# Ativar Painéis de Widgets

## Objetivo
Permitir ao admin ativar/inativar painéis para controlar disponibilidade em modos de uso.

## Pré-condições
- Usuário logado como Master.
- Existe ao menos 1 painel cadastrado.

## ACs
- AC-01: Inativar painel não-associado fica inativo na listagem.
- AC-02: Tentar inativar painel associado a modo-de-uso exibe modal de bloqueio.
- AC-03: Reativar via menu de modo-de-uso reabilita painel correspondente.
```

- [ ] **Step 2: Failing test** (`lib/input-normalizer/parsers/md.test.ts`)

```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseMd } from './md.js'

describe('parseMd', () => {
  it('extracts feature name, objetivo, contexto, ACs from PRD-style MD', () => {
    const raw = readFileSync('tests/fixtures/inputs/feature-prd-completo.md', 'utf8')
    const out = parseMd(raw)

    expect(out.featureName).toBe('Ativar Painéis de Widgets')
    expect(out.objetivo).toContain('controlar disponibilidade')
    expect(out.contexto).toHaveLength(2)
    expect(out.acs).toHaveLength(3)
    expect(out.acs[0].id).toBe('AC-01')
    expect(out.acs[1].raw).toContain('modal de bloqueio')
  })
})
```

- [ ] **Step 3: Run — must fail**

```bash
npm test -- md.test
# Expected: FAIL — parseMd is not defined
```

- [ ] **Step 4: Implement** (`lib/input-normalizer/parsers/md.ts`)

```typescript
import { marked } from 'marked'
import type { NormalizedInput, AcCandidate } from '../types.js'

const AC_LINE = /^AC-?(\d+)[:\s-]\s*(.+)$/i

export function parseMd(raw: string): NormalizedInput {
  const tokens = marked.lexer(raw)

  let featureName = ''
  let objetivo: string | null = null
  const contexto: string[] = []
  const acs: AcCandidate[] = []
  const anexos: string[] = []

  let currentSection: string | null = null

  for (const tok of tokens) {
    if (tok.type === 'heading') {
      if (tok.depth === 1) featureName = tok.text.trim()
      const t = tok.text.toLowerCase()
      if (/objetivo/.test(t)) currentSection = 'objetivo'
      else if (/(contexto|pré-condi|pre-condi)/.test(t)) currentSection = 'contexto'
      else if (/(acs|crit[ée]rios|cen[áa]rios)/.test(t)) currentSection = 'acs'
      else if (/(anexos|refer[êe]ncias)/.test(t)) currentSection = 'anexos'
      else currentSection = null
      continue
    }

    if (tok.type === 'paragraph' && currentSection === 'objetivo' && !objetivo) {
      objetivo = tok.text.trim()
    }

    if (tok.type === 'list') {
      for (const item of tok.items) {
        const text = item.text.trim()
        if (currentSection === 'contexto') contexto.push(text)
        if (currentSection === 'acs') {
          const m = text.match(AC_LINE)
          if (m) {
            acs.push({
              id: `AC-${m[1].padStart(2, '0')}`,
              raw: m[2].trim(),
              inferred: false,
            })
          }
        }
        if (currentSection === 'anexos') anexos.push(text)
      }
    }
  }

  return {
    featureName,
    objetivo,
    contexto,
    acs,
    gaps: [],
    anexos,
  }
}
```

- [ ] **Step 5: Run — must pass**

```bash
npm test -- md.test
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add lib/input-normalizer/parsers/md.ts lib/input-normalizer/parsers/md.test.ts tests/fixtures/inputs/feature-prd-completo.md
git commit -m "feat(normalizer): MD parser (PRD/AC structure detection)"
```

### Task 22: TDD — TXT parser + bare AC-list

**Files:**
- Create: `lib/input-normalizer/parsers/txt.ts`
- Create: `lib/input-normalizer/parsers/txt.test.ts`
- Create: `tests/fixtures/inputs/feature-ac-list-cru.txt`

- [ ] **Step 1: Fixture** (cru, sem headings)

```text
Feature: Recuperar senha

AC-01: Usuário clica em "Esqueci senha" e recebe email com link.
AC-02: Link expira em 30 minutos.
AC-03: Após reset, login com nova senha funciona.
```

- [ ] **Step 2: Failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseTxt } from './txt.js'

describe('parseTxt', () => {
  it('extracts feature name and ACs from bare AC list', () => {
    const raw = readFileSync('tests/fixtures/inputs/feature-ac-list-cru.txt', 'utf8')
    const out = parseTxt(raw)

    expect(out.featureName).toBe('Recuperar senha')
    expect(out.acs).toHaveLength(3)
    expect(out.acs[0].id).toBe('AC-01')
    expect(out.acs[0].inferred).toBe(false)
  })

  it('flags inferido=true when no explicit AC structure detected', () => {
    const out = parseTxt('Algum texto solto sem estrutura.')
    expect(out.gaps.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Implement**

```typescript
import type { NormalizedInput, AcCandidate } from '../types.js'

const FEATURE_LINE = /^(feature|funcionalidade):\s*(.+)$/i
const AC_LINE = /^AC-?(\d+)[:\s-]\s*(.+)$/i

export function parseTxt(raw: string): NormalizedInput {
  let featureName = ''
  const acs: AcCandidate[] = []
  const gaps: string[] = []

  for (const line of raw.split(/\r?\n/)) {
    const fm = line.match(FEATURE_LINE)
    if (fm) {
      featureName = fm[2].trim()
      continue
    }
    const am = line.match(AC_LINE)
    if (am) {
      acs.push({
        id: `AC-${am[1].padStart(2, '0')}`,
        raw: am[2].trim(),
        inferred: false,
      })
    }
  }

  if (!featureName) gaps.push('Nome da feature não identificado.')
  if (acs.length === 0) gaps.push('Nenhum AC identificado no texto.')

  return {
    featureName,
    objetivo: null,
    contexto: [],
    acs,
    gaps,
    anexos: [],
  }
}
```

- [ ] **Step 4: Run + Commit**

```bash
npm test -- txt.test
git add lib/input-normalizer/parsers/txt.ts lib/input-normalizer/parsers/txt.test.ts tests/fixtures/inputs/feature-ac-list-cru.txt
git commit -m "feat(normalizer): TXT parser (bare AC list + gap detection)"
```

### Task 23: TDD — PDF parser

**Files:**
- Create: `lib/input-normalizer/parsers/pdf.ts`
- Create: `lib/input-normalizer/parsers/pdf.test.ts`

- [ ] **Step 1: Failing test (uses md parser internally after PDF→text)**

```typescript
import { describe, expect, it } from 'vitest'
import { parsePdf } from './pdf.js'
import { readFileSync, existsSync } from 'node:fs'

describe('parsePdf', () => {
  it.skipIf(!existsSync('tests/fixtures/inputs/feature-pdf-completo.pdf'))(
    'extracts text and routes to MD parser',
    async () => {
      const buf = readFileSync('tests/fixtures/inputs/feature-pdf-completo.pdf')
      const out = await parsePdf(buf)
      expect(out.featureName.length).toBeGreaterThan(0)
    }
  )

  it('throws clearly on corrupted PDF', async () => {
    await expect(parsePdf(Buffer.from('not a pdf'))).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Implement**

```typescript
import pdfParse from 'pdf-parse'
import { parseMd } from './md.js'
import type { NormalizedInput } from '../types.js'

export async function parsePdf(buf: Buffer): Promise<NormalizedInput> {
  const data = await pdfParse(buf)
  return parseMd(data.text)
}
```

- [ ] **Step 3: Run + Commit**

```bash
npm test -- pdf.test
git add lib/input-normalizer/parsers/pdf.ts lib/input-normalizer/parsers/pdf.test.ts
git commit -m "feat(normalizer): PDF parser (pdf-parse → reuse MD parser)"
```

### Task 24: TDD — DOCX parser

**Files:**
- Create: `lib/input-normalizer/parsers/docx.ts`
- Create: `lib/input-normalizer/parsers/docx.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { parseDocx } from './docx.js'

describe('parseDocx', () => {
  it.skipIf(!existsSync('tests/fixtures/inputs/feature-docx-completo.docx'))(
    'extracts text and routes to MD parser',
    async () => {
      const buf = readFileSync('tests/fixtures/inputs/feature-docx-completo.docx')
      const out = await parseDocx(buf)
      expect(out.featureName.length).toBeGreaterThan(0)
    }
  )

  it('throws on non-docx buffer', async () => {
    await expect(parseDocx(Buffer.from('not a docx'))).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Implement**

```typescript
import mammoth from 'mammoth'
import { parseMd } from './md.js'
import type { NormalizedInput } from '../types.js'

export async function parseDocx(buf: Buffer): Promise<NormalizedInput> {
  const { value } = await mammoth.extractRawText({ buffer: buf })
  return parseMd(value)
}
```

- [ ] **Step 3: Run + Commit**

```bash
npm test -- docx.test
git add lib/input-normalizer/parsers/docx.ts lib/input-normalizer/parsers/docx.test.ts
git commit -m "feat(normalizer): DOCX parser (mammoth → reuse MD parser)"
```

### Task 25: TDD — Dispatcher (format detection + delegation)

**Files:**
- Create: `lib/input-normalizer/index.ts`
- Create: `lib/input-normalizer/index.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { normalizeInput } from './index.js'

describe('normalizeInput', () => {
  it('dispatches to MD parser by extension', async () => {
    const out = await normalizeInput('tests/fixtures/inputs/feature-prd-completo.md')
    expect(out.featureName).toBe('Ativar Painéis de Widgets')
  })

  it('dispatches to TXT parser', async () => {
    const out = await normalizeInput('tests/fixtures/inputs/feature-ac-list-cru.txt')
    expect(out.featureName).toBe('Recuperar senha')
  })

  it('rejects unknown extensions', async () => {
    await expect(normalizeInput('foo.xlsx')).rejects.toThrow(/formato/i)
  })
})
```

- [ ] **Step 2: Implement**

```typescript
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { parseMd } from './parsers/md.js'
import { parseTxt } from './parsers/txt.js'
import { parsePdf } from './parsers/pdf.js'
import { parseDocx } from './parsers/docx.js'
import type { NormalizedInput } from './types.js'

export async function normalizeInput(path: string): Promise<NormalizedInput> {
  const ext = extname(path).toLowerCase()
  switch (ext) {
    case '.md':
      return parseMd(await readFile(path, 'utf8'))
    case '.txt':
      return parseTxt(await readFile(path, 'utf8'))
    case '.pdf':
      return parsePdf(await readFile(path))
    case '.docx':
      return parseDocx(await readFile(path))
    default:
      throw new Error(`Formato não-suportado: ${ext}. Aceitos: .md, .txt, .pdf, .docx`)
  }
}
```

- [ ] **Step 3: Run + Commit**

```bash
npm test
git add lib/input-normalizer/index.ts lib/input-normalizer/index.test.ts
git commit -m "feat(normalizer): dispatcher (extension → parser)"
```

### Task 26: TDD — Markdown emitter (produces normalized-input.md)

**Files:**
- Create: `lib/input-normalizer/emitter.ts`
- Create: `lib/input-normalizer/emitter.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { emitNormalizedMd } from './emitter.js'

describe('emitNormalizedMd', () => {
  it('renders all sections in canonical order', () => {
    const md = emitNormalizedMd({
      featureName: 'Foo',
      objetivo: 'Fazer X',
      contexto: ['logado'],
      acs: [{ id: 'AC-01', raw: 'Faz Y', inferred: false }],
      gaps: ['perfil indefinido'],
      anexos: [],
    })

    expect(md).toMatch(/^# Foo/m)
    expect(md).toMatch(/## Objetivo\n\nFazer X/m)
    expect(md).toMatch(/## Contexto\/Pré-condições/m)
    expect(md).toMatch(/^- logado/m)
    expect(md).toMatch(/## ACs detectados/m)
    expect(md).toMatch(/^- \*\*AC-01\*\*: Faz Y/m)
    expect(md).toMatch(/## Gaps detectados/m)
    expect(md).toMatch(/^- perfil indefinido/m)
  })
})
```

- [ ] **Step 2: Implement**

```typescript
import type { NormalizedInput } from './types.js'

export function emitNormalizedMd(n: NormalizedInput): string {
  const out: string[] = []
  out.push(`# ${n.featureName || '(feature sem título)'}`)
  out.push('')
  out.push('## Objetivo')
  out.push('')
  out.push(n.objetivo ?? '_não informado — preencher no Q&A_')
  out.push('')
  out.push('## Contexto/Pré-condições')
  out.push('')
  if (n.contexto.length === 0) out.push('_não informado — preencher no Q&A_')
  else for (const c of n.contexto) out.push(`- ${c}`)
  out.push('')
  out.push('## ACs detectados')
  out.push('')
  if (n.acs.length === 0) out.push('_nenhum AC identificado — preencher no Q&A_')
  else
    for (const ac of n.acs) out.push(`- **${ac.id}**: ${ac.raw}${ac.inferred ? ' _(inferido)_' : ''}`)
  out.push('')
  out.push('## Gaps detectados')
  out.push('')
  if (n.gaps.length === 0) out.push('_nenhum gap detectado automaticamente_')
  else for (const g of n.gaps) out.push(`- ${g}`)
  out.push('')
  out.push('## Anexos')
  out.push('')
  if (n.anexos.length === 0) out.push('_nenhum anexo_')
  else for (const a of n.anexos) out.push(`- ${a}`)
  out.push('')
  return out.join('\n')
}
```

- [ ] **Step 3: Run + Commit**

```bash
npm test -- emitter.test
git add lib/input-normalizer/emitter.ts lib/input-normalizer/emitter.test.ts
git commit -m "feat(normalizer): markdown emitter (normalized-input.md)"
```

### Task 27: CLI wrapper for the lib (used by `ler-feature-doc` skill)

**Files:**
- Create: `lib/input-normalizer/cli.ts`

- [ ] **Step 1: Implement**

```typescript
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { normalizeInput } from './index.js'
import { emitNormalizedMd } from './emitter.js'

async function main() {
  const [, , inputPath, outPath] = process.argv
  if (!inputPath || !outPath) {
    console.error('uso: tsx lib/input-normalizer/cli.ts <input> <out>')
    process.exit(1)
  }
  const normalized = await normalizeInput(inputPath)
  const md = emitNormalizedMd(normalized)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, md, 'utf8')
  console.log(`OK normalizado: ${outPath}`)
}

main().catch((err) => {
  console.error('ERRO normalizer:', err.message)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add lib/input-normalizer/cli.ts
git commit -m "feat(normalizer): CLI wrapper (tsx-runnable)"
```

---

## Phase E — State machine + zod schemas

### Task 28: zod schema for project.config.json

**Files:**
- Create: `lib/schemas/project-config.ts`
- Create: `lib/schemas/project-config.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { projectConfigSchema } from './project-config.js'

describe('projectConfigSchema', () => {
  it('accepts minimal valid config', () => {
    const r = projectConfigSchema.safeParse({
      projectName: 'foo',
      environment: 'staging',
      browsers: ['chromium'],
      headless: true,
      reporting: { format: 'html', outputDir: 'outputs', screenshotsOnFailure: true },
      codeGeneration: { pagesDir: 'pages', featuresDir: 'tests/features', overwriteExistingPages: false, overwriteExistingTests: true },
    })
    expect(r.success).toBe(true)
  })

  it('rejects missing projectName', () => {
    const r = projectConfigSchema.safeParse({})
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Implement**

```typescript
import { z } from 'zod'

export const projectConfigSchema = z.object({
  projectName: z.string().min(1),
  testAnalysisFile: z.string().optional().default(''),
  environment: z.string().min(1),
  browsers: z.array(z.enum(['chromium', 'firefox', 'webkit'])).default(['chromium']),
  headless: z.boolean().default(true),
  reporting: z.object({
    format: z.string().default('html'),
    outputDir: z.string().default('outputs'),
    screenshotsOnFailure: z.boolean().default(true),
  }),
  performance: z
    .object({
      enableTracing: z.boolean().default(true),
      enableVideo: z.boolean().default(false),
    })
    .optional(),
  codeGeneration: z.object({
    pagesDir: z.string().default('pages'),
    featuresDir: z.string().default('tests/features'),
    overwriteExistingPages: z.boolean().default(false),
    overwriteExistingTests: z.boolean().default(true),
  }),
})

export type ProjectConfig = z.infer<typeof projectConfigSchema>
```

- [ ] **Step 3: Run + Commit**

```bash
npm test -- project-config.test
git add lib/schemas/
git commit -m "feat(schemas): zod schema for project.config.json"
```

### Task 29: TDD — State machine

**Files:**
- Create: `lib/state/machine.ts`
- Create: `lib/state/machine.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadState, saveState, advancePhase, type Phase } from './machine.js'

describe('state machine', () => {
  const dir = mkdtempSync(join(tmpdir(), 'state-'))
  const path = join(dir, '.state.json')

  it('returns initial state when file missing', () => {
    const s = loadState(path)
    expect(s.lastPhase).toBe('init')
  })

  it('persists advanced phase', () => {
    saveState(path, advancePhase(loadState(path), 'phase-1'))
    const s = loadState(path)
    expect(s.lastPhase).toBe('phase-1')
    expect(s.completedAt).toBeDefined()
  })

  it('rejects backward phase transition', () => {
    let s = advancePhase(loadState(path), 'phase-3')
    saveState(path, s)
    expect(() => advancePhase(loadState(path), 'phase-1')).toThrow(/regress/i)
    rmSync(dir, { recursive: true, force: true })
  })
})
```

- [ ] **Step 2: Implement**

```typescript
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type Phase =
  | 'init'
  | 'preflight'
  | 'phase-1'
  | 'phase-2'
  | 'phase-3'
  | 'phase-4'
  | 'phase-5'
  | 'phase-6'
  | 'done'

const ORDER: Phase[] = [
  'init',
  'preflight',
  'phase-1',
  'phase-2',
  'phase-3',
  'phase-4',
  'phase-5',
  'phase-6',
  'done',
]

export interface State {
  lastPhase: Phase
  completedAt?: string
  version: 1
  notes?: string
}

export function loadState(path: string): State {
  if (!existsSync(path)) return { lastPhase: 'init', version: 1 }
  return JSON.parse(readFileSync(path, 'utf8')) as State
}

export function saveState(path: string, s: State): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(s, null, 2), 'utf8')
}

export function advancePhase(current: State, next: Phase): State {
  const ci = ORDER.indexOf(current.lastPhase)
  const ni = ORDER.indexOf(next)
  if (ni <= ci) throw new Error(`Transição inválida (regressão): ${current.lastPhase} → ${next}`)
  return { ...current, lastPhase: next, completedAt: new Date().toISOString() }
}
```

- [ ] **Step 3: Run + Commit**

```bash
npm test -- machine.test
git add lib/state/
git commit -m "feat(state): orchestrator phase machine"
```

---

## Phase F — Wire up + smoke

### Task 30: Adapt smoke.spec.ts (lightweight)

**Files:**
- Modify: `tests/setup/smoke.spec.ts`

Keep only: storageState valid, login page reachable, baseURL responds.

### Task 31: Run full unit test suite

- [ ] **Step 1: Run**

```bash
cd /home/joao/Documentos/twygo/twygo-qa-agent
npm test
# Expected: all green
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
# Expected: no errors
```

### Task 32: Example input fixture (real run material)

**Files:**
- Create: `inputs/exemplo-ativar-painel.md`

Copy/adapt content matching the Twygo "Ativar Painel" feature already present in `agent-playwright/projects/widgets/`, so QA has a real sample to feed into the new pipeline.

### Task 33: Final commit + push

- [ ] **Step 1: Verify clean working tree**

```bash
git status
# Expected: nothing to commit, working tree clean
```

- [ ] **Step 2: Add remote + push**

```bash
git remote add origin git@github.com:ASP-J/teste-qa-joao.git
git branch -M main
git push -u origin main
```

---

## Self-Review notes

**Spec coverage:**
- Repo bootstrap → Tasks 1-9 ✓
- 8 skills → Tasks 10-17 ✓
- Slash command → Task 19 ✓
- Normalizer lib + tests → Tasks 20-27 ✓
- State machine + schemas → Tasks 28-29 ✓
- Smoke + integration → Tasks 30-31 ✓
- Sample input → Task 32 ✓
- Push → Task 33 ✓

**Open items** (deferred — not blocking initial push):
- E2E integration test with mocked MCPs (deferred; covered by manual dogfooding)
- Regression goldens (deferred; created from real runs over time)
- `prose-patterns.md` trim for new repo (kept verbatim initially)

**Type consistency:** `NormalizedInput`, `AcCandidate`, `Phase`, `State`, `ProjectConfig` defined once; consumers reference via barrel exports.
