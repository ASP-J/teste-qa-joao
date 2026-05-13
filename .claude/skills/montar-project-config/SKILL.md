---
name: montar-project-config
description: Lê `normalized-input.md` (env detectado no Q&A) e `recon-feature.md` (baseURL canônica) e emite `artifacts/project.config.json` com o schema compatível com `agent-playwright/projects/<slug>/project.config.json`. Use como fase 6 do orchestrator. Output é validado via `lib/schemas/project-config.ts` (zod) antes de gravar.
version: 0.1.0
---

# montar-project-config

## Quando usar

Phase 6 (última) do `twygo-feature-orchestrator`. Pré-condição: fases 1-5 completas.

## Input

- `outputs/<slug>/normalized-input.md` (env + slug)
- `outputs/<slug>/recon-feature.md` (baseURL confirmada)

## Output

`outputs/<slug>/artifacts/project.config.json`.

## Schema

Conforme `lib/schemas/project-config.ts`:

```json
{
  "projectName": "<slug-PascalCase ou slug>",
  "testAnalysisFile": "",
  "environment": "<env-resolvido>",
  "browsers": ["chromium"],
  "headless": true,
  "reporting": {
    "format": "html",
    "outputDir": "outputs",
    "screenshotsOnFailure": true
  },
  "performance": {
    "enableTracing": true,
    "enableVideo": false
  },
  "codeGeneration": {
    "pagesDir": "pages",
    "featuresDir": "tests/features",
    "overwriteExistingPages": false,
    "overwriteExistingTests": true
  }
}
```

## Origem de cada campo

| Campo | Vem de |
|---|---|
| `projectName` | slug (mesmo do diretório `outputs/<slug>/`) |
| `testAnalysisFile` | sempre `""` (este repo não usa XML) |
| `environment` | Q&A log (staging / staging-widgets / etc) |
| `browsers` | default `["chromium"]` (Twygo só roda Chrome) |
| `headless` | default `true` |
| `reporting.*` | defaults |
| `performance.*` | defaults |
| `codeGeneration.*` | defaults |

## Validação

```typescript
import { projectConfigSchema } from '../../../lib/schemas/project-config.js'
const result = projectConfigSchema.safeParse(candidate)
if (!result.success) throw new Error(result.error.message)
```

Falha de schema → aborta com erro detalhado.

## Anti-patterns proibidos

- **Não inclua `exploratory` config** — este repo não roda exploratory probes.
- **Não inclua `testAnalysisFile`** apontando pra XML (legacy do agent-playwright).
- **Não force `browsers: ['firefox', 'webkit']`** — Twygo oficialmente só Chrome.

## Advance state

Após gravar artifact, `advancePhase(..., 'phase-6')` → automaticamente avança pra `done` quando todas as fases terminam.

## Referências

- Schema: `lib/schemas/project-config.ts`
- Exemplo no repo agent-playwright origem: `projects/widgets/project.config.json`
