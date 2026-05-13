---
name: testar-filtro-drawer-twygo
description: Como testar listagens Twygo cujo "Filtrar" é um drawer Chakra slide-in com 2 modos (Lista de filtros vs Edição de filtro), filtros padrão (radio) + filtros por coluna (accordion + Opções de filtro), e botão `#clear-filter` externo. Use ao gerar specs para qualquer testsuite "Pesquisa e Filtros" ou afim — Painéis, Modos de uso, e quaisquer listagens novas Twygo que herdem o componente.
version: 1.0.0
---

# testar-filtro-drawer-twygo

## Sintoma canônico do drawer

O botão "Filtrar" (icon `filter_alt`, id estável `#open-filter`) abre um
`<div role="dialog" class="chakra-slide chakra-modal__content">` que entra
pela direita da tela e ocupa altura total. **NÃO confundir** com filtro inline
ou popover — é um drawer modal completo.

Conforme há filtro saved aplicado, o drawer abre em **modo diferente**:

| Estado da listagem | Modo do drawer | Elemento de detecção |
|---|---|---|
| Sem filtro aplicado (entrada limpa) | **A — Lista de filtros** | `#list-filter-close`, `#list-filter-apply` visíveis |
| Com filtro saved aplicado (`#clear-filter` visível) | **B — Edição de filtro** | `#form-filter-title`, `#form-filter-apply` visíveis |
| Após click em `#form-filter-list-button` dentro de B | Volta para A | — |

Spec que assume sempre modo A vai quebrar quando rodar em sequência: o
primeiro spec aplica um filtro e o seguinte, ao abrir drawer, cai em B.

## Estrutura DOM

### Modo A — "Lista de filtros"

```
[role="dialog"]
├─ #list-filter-close (X)
├─ #icon-search-filter (busca de filtros saved)
├─ Accordion "Filtros padrão" (expanded by default)
│   ├─ label "Painéis ativos" + #default-filters-0 (radio)
│   ├─ label "Painéis inativos" + #default-filters-1 (radio)
│   └─ ...
├─ Accordion "Filtros compartilhados" (collapsed)
├─ Accordion "Meus filtros" (collapsed)
├─ #list-filter-cancel
└─ #list-filter-apply
```

### Modo B — "Edição de filtro"

```
[role="dialog"]
├─ #form-filter-close (X)
├─ #form-filter-title         (texto do filtro corrente, ex.: "Painéis ativos")
├─ #form-filter-list-button   (toggle "Lista de filtros" → volta pra modo A)
├─ form
│   ├─ Accordion "Colunas para filtrar" (#accordion-button-expand-columns-filters)
│   │   ├─ [colunas ativas com seus inputs/checkboxes/datepickers]
│   │   └─ #menu-button-plus-options-filters ("Opções de filtro")
│   ├─ Accordion "Colunas para exibir" (#accordion-button-expand-columns-show)
│   └─ Accordion "Salvar filtro" (#accordion-button-expand-submit-filter)
├─ #form-filter-cancel
└─ #form-filter-apply

[fora do drawer]
└─ #clear-filter   (aparece quando há filtro aplicado; some ao limpar)
```

## Padrão certo (Page Object expõe ações de negócio)

`projects/widgets/pages/PaineisListPage.ts` já implementa os métodos
canônicos — reusar antes de duplicar:

```ts
// Abrir/fechar drawer (cobre ambos os modos)
async openFilterDrawer(): Promise<void>
async closeFilterDrawer(): Promise<void>

// Filtro padrão — auto-detecta modo B e volta pra A antes de selecionar
async applyDefaultFilter(name: 'Painéis ativos' | 'Painéis inativos'): Promise<void>

// Limpar filtro aplicado (idempotente)
async clearFilter(): Promise<void>

// Search input fora do drawer (debounce server-side ~1s)
async searchPanels(query: string): Promise<void>
async clearSearch(): Promise<void>
```

Como reusar em listagem nova (ex: futura suíte "Pesquisa e Filtros — Cursos"):

1. Copie os IDs do drawer (são os mesmos — o componente é compartilhado entre
   listagens Twygo).
2. No Page Object da listagem nova, herde os métodos via mixin OU duplique
   se a listagem tem comportamentos próprios (ex: filtros padrão diferentes).
3. **NÃO** invente seletores novos — `#open-filter`, `#clear-filter`,
   `#list-filter-*`, `#form-filter-*` são canônicos.

## Cenários mapeados (XML → spec)

| Cenário XML | Status conhecido | Como testar |
|---|---|---|
| "Aplicar filtro padrão 'X'" onde X ∈ {Ativos, Inativos} | READY | `applyDefaultFilter('X')` + `expect(getClearFilterButton()).toBeVisible()` + iterar `getRowNames()` e asserir invariante (todos checkboxes ativos/inativos conforme caso) |
| "Aplicar filtro padrão 'Painéis próprios/compartilhados'" | **OUT-OF-SCOPE** (não implementado nesta fase) | Excluir spec do projeto. Feature de compartilhamento foi descopada do widgets (2026-05-11); recriar quando o produto retomar |
| "Filtrar pela coluna 'Nome'" | READY | `applyColumnFilter({ column: 'Nome', value: '<nome>' })` — react-select multi `#option_name`, seleciona option-0 do dropdown |
| "Filtrar pela coluna 'Descrição'" | READY | `applyColumnFilter({ column: 'Descrição', value: '<termo>' })` — text input `#option_description` |
| "Filtrar pela coluna 'Data de criação'" | READY | `applyColumnFilter({ column: 'Data de criação', dateFrom: 'YYYY-MM-DD', dateTo?: 'YYYY-MM-DD' })` — 2 date inputs `#option_created_at-from`/`-to` |
| "Filtrar pela coluna 'Ativo'" | READY | `applyColumnFilter({ column: 'Ativo', value: 'Sim' \| 'Não' })` — checkboxes `#option_is_active-true/-false` |
| "Filtrar pela coluna 'Provedora'" | **OUT-OF-SCOPE** (não implementado nesta fase) | Coluna Provedora depende de compartilhamento (origem do painel). Spec excluído 2026-05-11 — recriar quando feature voltar |
| "Pesquisar painel pelo nome/descrição" | READY | Search server-side debounced; consulta nome E descrição. Use `searchPanels(query)` (faz `waitForLoadState('networkidle')`) |
| "Pesquisar termo inexistente" | READY | Empty state literal: **"Não há dados para exibir"** (NÃO "Nenhum resultado encontrado") |
| "Combinar pesquisa + filtros padrão" | READY | Apply preset + searchPanels(term). Iterar rows e asserir tanto invariante do filtro quanto containment do termo |

## Fluxo "Novo > Adicionar coluna" — caminho correto

`applyColumnFilter` na POM implementa esta sequência (re-explorada
2026-05-11 após primeira passada incorreta):

1. **Limpar filtro residual** — `clearFilter()` se `#clear-filter` visível.
   Sem isso, o "Novo" abre filtro contaminado.
2. **Open drawer** + click no botão "Novo" (texto literal "Novo" dentro do
   drawer modo A, ao lado do ícone `add`). Drawer transita para modo B
   com `#form-filter-title = "Filtro rápido"` e accordion vazio.
3. **Click no menu** `#menu-button-plus-options-filters` — abre lista de
   4 colunas disponíveis (Nome, Descrição, Data de criação, Ativo?).
4. **Click na `<label class="chakra-checkbox">`** do menuitem desejado.
   **NÃO** clique no `<button role="menuitem">` que envolve — o handler do
   menuitem intercepta o click e o checkbox interno permanece unchecked
   (essa foi a confusão da primeira passada).
5. **Escape** para fechar o menu (Chakra Menu mantém open por design para
   multi-select). Após Escape, o accordion ganha os inputs específicos da
   coluna.
6. **Preencher inputs** (mapeamento por coluna):
   - **Nome**: `#option_name` é um **react-select multi** (div container).
     Click no container → fill no `input[id^="react-select-"][id$="-input"]`
     interno → click na `[id^="react-select-"][id*="-option-0"]` primeira opção.
   - **Descrição**: `input#option_description` (text simples). NB: o ID
     resolve a 2 elementos (um `<div>` decorativo + o input real); use
     o seletor `input#option_description` para evitar strict-mode violation.
   - **Data de criação**: `#option_created_at-from` (obrigatório) e
     `#option_created_at-to` (opcional). Inputs `type="date"`, formato ISO.
   - **Ativo?**: `#option_is_active-true` (Sim) ou `-false` (Não).
     Checkbox hidden via clip — click na label irmã.
7. **`#form-filter-apply`** — drawer fecha + `#clear-filter` aparece +
   aguarde `waitForLoadState('networkidle')` para listagem reidratar.

## Anti-patterns

- ❌ **Assumir que o drawer sempre abre em modo A.** Se o spec anterior
  aplicou filtro, o drawer abre em B. `applyDefaultFilter` já trata — mas
  ao escrever lógica direta, sempre detecte via `#form-filter-title` first.
- ❌ **Usar `getRowByName(name)` para iterar resultados de filtro.**
  `<p hasText: 'Painel 1'>` matchea "Painel 1, 10, 11, 12, 13..." (substring)
  → strict-mode violation. **Use `getRowByItemName(name)`** que ancora em
  `tbody tr[data-item-name="..."]` (exact).
- ❌ **Assertar `getRowCount() === 0` no empty state.** O produto renderiza
  uma `<tr>` com placeholder "Não há dados para exibir" — count é 1, não 0.
  Asserte apenas `getEmptyStateNoResults().toBeVisible()`.
- ❌ **Esperar com `waitForTimeout(2000)` após `fill()` no search.**
  Use `searchPanels` que faz `waitForLoadState('networkidle')` (cobre debounce
  + request) — regra dura #1 do CLAUDE.md.
- ❌ **Hardcodar nomes de painel** ("Vendas 2026", "Marketing 2026" do XML).
  Org de teste tem seed "Painel 1..30" (numerado por created_at desc). Use
  `getFirstPanelName()` ou o nome conhecido do seed.
- ❌ **Não revertar estado em TC6 (filtro inativos).** A org não tem
  inativos por default; spec inativa 1 painel no setup. **Sempre** use
  `try { ... } finally { clearFilter(); ensureActive(name); }` — sem
  revert, próxima execução começa com painel inativo lateral.
- ❌ **Click no menuitem "Opções de filtro" sem fechar o menu depois.** O
  Chakra Menu fica aberto e absorve clicks subsequentes. Adicione
  `await page.keyboard.press('Escape')` ou (preferível) revise se o flow
  precisa do menuitem.
- ❌ **Tratar TC fixme como bug.** Os 7 fixmes da primeira passada
  (Painéis próprios/compartilhados, Nome/Desc/Data via menuitem, Provedora,
  descrição) são **lacunas de UI vs XML**, não bugs de teste. Quando o
  produto evoluir, remova os fixmes referenciando este skill.

## Não resolvido (futuro)

### Modal NPS Sofia e similar — já coberto por outro skill

Drawer está em foco ⇒ NPS Sofia ainda pode aparecer antes do drawer abrir.
A skill `fechar-modais-twygo` lida com isso; nada novo aqui.

### Compartilhamento de painéis — OUT-OF-SCOPE

A funcionalidade de "compartilhamento" entre organizações foi descopada
do projeto widgets em 2026-05-11. Por consequência, 3 testcases do XML
foram **excluídos** do agente (specs deletados, não fixme):

- "Aplicar filtro padrão 'Painéis próprios'"
- "Aplicar filtro padrão 'Painéis compartilhados'"
- "Filtrar pela coluna 'Provedora'"

O XML em `inputs/Analise_Teste_Paineis_Widgets.xml` mantém os 3 cenários
como histórico (regra dura #6 — XML é imutável). Quando o feature
retornar ao roadmap, basta recriar os 3 specs.

## Onde o padrão é usado no codebase

- `projects/widgets/pages/PaineisListPage.ts` — implementação canônica dos
  métodos `openFilterDrawer`, `applyDefaultFilter`, `applyColumnFilter`,
  `searchPanels`, `clearSearch`, `clearFilter`, `getFirstPanelName`,
  `getEmptyStateNoResults`.
- `projects/widgets/tests/features/pesquisa-e-filtros/*.spec.ts` — 13
  specs (6 READY, 7 fixme). Estado pós-execução em
  `outputs/widgets/reports/pesquisa-e-filtros_*/`.
- `projects/widgets/specs/pesquisa-e-filtros-plan.md` — plano com mapeamento
  TC → status + raciocínio dos fixmes.

## Por que esta skill existe

Primeira passada da suíte (2026-05-11) revelou 7 categorias de gotcha que
custaram 6 iterações de re-run (37min total) para mapear: 2 modos do drawer,
strict-mode violation com nomes-prefixo, empty state com texto diferente do
esperado, search com debounce server-side, fluxo de coluna via menuitem que
não persiste, preset que já traz coluna no accordion, e leftover de specs
anteriores (painéis "AddAba w0-..." que `getFirstPanelName` precisou filtrar).

A próxima suíte similar (ex: "Pesquisa e Filtros" do módulo Modos de uso, ou
de Cursos) deve consultar esta skill **antes** de invocar planner/generator
— os anti-patterns acima evitam ~80% do retrabalho.
