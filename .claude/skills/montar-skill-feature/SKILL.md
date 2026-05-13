---
name: montar-skill-feature
description: Lê `recon-feature.md` + `artifacts/ACs-canonical.md` e emite `artifacts/SKILL.md` no formato canônico das skills Twygo (frontmatter + quando-usar + padrão canônico + anti-patterns + exemplo TS + refs). Estilo `interagir-switch-chakra-twygo`. Use como fase 5 do orchestrator.
version: 0.1.0
---

# montar-skill-feature

## Quando usar

Phase 5 do `twygo-feature-orchestrator`. Pré-condição: fase 4 produziu `ACs-canonical.md`.

## Input

- `outputs/<slug>/recon-feature.md` (padrões+gotchas observados)
- `outputs/<slug>/artifacts/ACs-canonical.md` (cenários canonicalizados)

## Output

`outputs/<slug>/artifacts/SKILL.md`.

## Template

```markdown
---
name: testar-<slug>-twygo
description: <quando usar — 1 parágrafo: sintoma+contexto. Ex: "Use ao gerar specs Twygo que cobrem ativar/inativar painéis no módulo Widgets. Cobre o fluxo de toggle, modal de bloqueio quando painel está associado a modo-de-uso, e reativação via menu do modo-de-uso.">
version: 0.1.0
---

# Testar <Nome da Feature>

## Quando usar

<Sintoma de aplicação — qual feature, qual fluxo, qual contexto Twygo>

## Padrão canônico

<Como testar — seletores chave, ordem de interação, sync points>

### Setup

- Env: `staging` (orgId 36602) [ou outro conforme Q&A]
- Perfil: Master
- StorageState global do `globalSetup` cobre login

### Sequência canônica

1. Navegar pra rota: `/o/36602/widgets/paineis`
2. Aguardar tabela carregar: `expect(getByTestId('tabela-paineis')).toBeVisible()`
3. Interagir com switch via `setSwitch()` (gotcha chakra-switch)
4. Aguardar toast: `getToast().first()` + `waitForToastsToClear()`

## Anti-patterns

<Gotchas detectados no recon que NÃO devem ser repetidos>

- ❌ Não clique direto no `input[type=checkbox]` do switch Chakra — use `setSwitch(locator, on)`.
- ❌ Não asserte toast por texto sem `.first()` — múltiplos toasts acumulam.
- ❌ Não hardcode orgId (36602) — use `getOrgId()` de `src/utils/environment.ts`.

## Exemplo (snippet de spec)

```typescript
import { test, expect } from '@playwright/test'
import { PaineisListPage } from '../pages/PaineisListPage'

test('inativar painel não-associado', async ({ page }) => {
  const paineis = new PaineisListPage(page)
  await paineis.goto()
  await paineis.toggleByName('Painel A', false)
  await expect(paineis.toast()).toContainText('Painel inativado')
})
```

## Exemplo (snippet de POM)

```typescript
import { Page, Locator } from '@playwright/test'
import { setSwitch } from '@utils/helpers'
import { getOrgId } from '@utils/environment'

export class PaineisListPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`/o/${getOrgId()}/widgets/paineis`)
  }

  async toggleByName(name: string, on: boolean) {
    const row = this.page.getByRole('row', { name })
    await setSwitch(row.getByRole('checkbox'), on)
  }

  toast(): Locator {
    return this.page.getByTestId('chakra-toast').first()
  }
}
```

## Referências

- ACs canonicalizados: [[ACs-canonical-<slug>]]
- Recon: [[recon-feature-<slug>]]
- Gotchas relacionados: [[interagir-switch-chakra-twygo]], [[testar-toast-chakra-twygo]]
```

## Regras de geração

1. **Slug do `name:`** — sempre `testar-<slug>-twygo`.
2. **`description:`** — 1 parágrafo, frase começa com "Use ao..." ou "Use quando...". Captura sintoma+contexto.
3. **Setup** — vem do Q&A log (env, perfil, dependências).
4. **Sequência canônica** — vem da sequência do AC-01 (cenário principal).
5. **Anti-patterns** — sempre cita ❌ no início; vem dos gotchas do recon.
6. **Exemplo de spec** — minimal mas executável (use POM real do snippet abaixo, sem inventar import).
7. **Exemplo de POM** — só inclua se a feature precisa de POM novo (a maioria precisa). Use helpers de `@utils/*` herdados.

## Validações antes de gravar

- Frontmatter válido (YAML).
- Sem placeholder `<...>` no body final (todos preenchidos).
- Cada `[[ref]]` resolve pra skill existente OU artefato sibling (`ACs-canonical-<slug>`, `recon-feature-<slug>`).
- Snippet TS compila mentalmente (imports plausíveis, métodos existem).

## Advance state

Após gravar artifact, `advancePhase(..., 'phase-5')`.

## Referências

- Estilo de skill: `.claude/skills/interagir-switch-chakra-twygo/SKILL.md` (canônico)
- Próxima fase: [[montar-project-config]]
