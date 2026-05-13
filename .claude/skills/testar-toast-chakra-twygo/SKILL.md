---
name: testar-toast-chakra-twygo
description: Toasts Chakra (`.chakra-toast`) acumulam no toast-manager quando ações sucessivas disparam vários — assert `expect(toast).toBeVisible()` filtrado só por texto viola strict-mode com `resolved to N elements`. Documenta o padrão canônico `getToast()` com `.first()` + helper `waitForToastsToClear()` para sincronizar antes de interagir com elementos sob o toast manager (Salvar Layout etc). Use ao gerar specs Twygo que validam toast de sucesso/erro após save em form, ou que clicam botões próximos ao canto `bottom-right`/`top-right` da tela.
version: 1.0.0
---

# testar-toast-chakra-twygo

## Sintoma canônico

Spec falha em uma das 2 formas:

### 1. Strict-mode violation no toast

```
Error: expect(locator).toBeVisible() failed
Locator: locator('.chakra-toast').filter({ hasText: 'Configurações salvas com sucesso' })
Expected: visible
Error: strict mode violation: ... resolved to 3 elements:
    1) <div class="chakra-toast">…</div>
    2) <div class="chakra-toast">…</div>
    3) <div class="chakra-toast">…</div>
```

O toast-manager Chakra renderiza N toasts simultâneos quando ações em sequência
disparam toasts (ex.: "Widget adicionado" + "Configurações salvas"). Filtro por
texto sozinho não desambigua.

### 2. Click em botão sob toast intercepta pointer events

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
  - element is visible, enabled and stable
  - scrolling into view if needed
  - done scrolling
  - <div data-status="success" class="chakra-alert__desc">Widget adicionado com sucesso</div>
    from <div class="chakra-portal">…</div> subtree intercepts pointer events
```

Toast no canto `bottom-right` ou `top-right` sobrepõe botões "Salvar Layout",
"Próximo", "Confirmar". Mesmo após scroll, Playwright detecta o toast como
interceptor e tenta retry até timeout.

## Padrão canônico

### Page Object: helper `getToast()` com `.first()`

```ts
// projects/widgets/pages/PainelFormPage.ts (modelo)
getToast(text: string): Locator {
  return this.page.locator('.chakra-toast').filter({ hasText: text }).first();
}
```

`.first()` resolve strict-mode sem perder a especificidade do filtro por texto.
Se 3 toasts "Configurações salvas" empilharem, Playwright valida o primeiro
visível — semanticamente correto (qualquer um deles é prova do save OK).

### Page Object: helper `waitForToastsToClear()` antes de click crítico

```ts
async waitForToastsToClear(timeout = 5000): Promise<void> {
  const toast = this.page.locator('.chakra-toast').first();
  if (await toast.isVisible().catch(() => false)) {
    await toast.waitFor({ state: 'hidden', timeout }).catch(() => {
      // Toast persiste — caller pode escolher force:true.
    });
  }
}
```

Chame **antes** de clicar em botão que pode estar sob toast:

```ts
await step("Clicar 'Salvar Layout' após adicionar widget", async () => {
  await painelForm.waitForToastsToClear();
  await painelForm.getSaveLayoutButton().click({ force: true });
});
```

Combinação canônica: `waitForToastsToClear` resolve a janela óbvia (toast
visível com tempo de auto-dismiss padrão Chakra ~3-5s); `force: true` cobre o
caso patológico onde o toast persiste (bug do produto, animação travada).

## Onde isso aparece em Twygo

- Drawer "Configurações do widget" → save → toast "Configurações salvas com sucesso"
- Drawer de Widget Catalog → adicionar widget → toast "Widget adicionado com sucesso"
- Listagem de Painéis → ativar/inativar → toast "Painel atualizado com sucesso"
- Form Identificação → save → toast "Painel salvo com sucesso" + redirect
- Modo regressivo: 1 spec executa save em loop, 5+ toasts empilhados ao final

## Anti-patterns

- ❌ **`expect(page.locator('.chakra-toast').filter({hasText:'X'})).toBeVisible()`** sem `.first()` — quebra com strict-mode na 2ª save da mesma sessão.
- ❌ **`page.waitForTimeout(3500)` após save pra "deixar toast sumir"** — viola regra dura #1 (CLAUDE.md). Use `waitForToastsToClear()` ou `expect(toast).toBeHidden({timeout:5000})`.
- ❌ **Filtrar toast por classe `.chakra-toast--success`** — Chakra não emite essa classe; o data attr `data-status="success"` está num descendant, não no `.chakra-toast` em si. Filtrar por texto + `.first()` é mais robusto.
- ❌ **Asserir 0 toasts visíveis antes de clicar** (`expect(page.locator('.chakra-toast')).toHaveCount(0)`) — falha rápido se houver toast residual de um teste anterior na mesma sessão (storage state compartilhado). Use a abordagem "tenta esperar, fallback force".

## Quando o padrão NÃO basta

Se o spec precisa **validar mensagem exata** do toast (não só "apareceu algum"):

```ts
// Pega texto do toast pra asserção literal
const toast = page.locator('.chakra-toast').filter({ hasText: 'Erro' }).first();
await expect(toast).toBeVisible();
await expect(toast).toContainText('Erro: campo obrigatório');
```

Se múltiplos toasts são esperados por design (ex.: bulk action dispara N
toasts de sucesso), use `toHaveCount(N)` em vez de `.first()`:

```ts
await expect(page.locator('.chakra-toast')).toHaveCount(3);
```

## Anti-pattern relacionado (CLAUDE.md §7.6)

Generator/healer **não** devem adicionar comentário `// toast pode acumular`
no spec — anti-pattern D (comentário WHAT). O método `getToast()` da Page
Object já encapsula o comportamento; o spec só chama. Comentário só vai se
for invariante não-óbvia (ex.: "toast de revert vem ANTES do toast de save
porque o backend processa async").

## Por que esta skill existe

2026-05-11, suíte "Editar/Excluir widgets" do projeto widgets — TC2 ("Salvar
alterações no drawer") falhou com strict-mode (3 toasts simultâneos:
"Widget adicionado" do pré-condição + 2 cópias de "Configurações salvas"),
TC5 ("Excluir widget") falhou com 30s timeout porque toast "Widget adicionado"
interceptou click em "Salvar Layout".

Fix: `.first()` no `getToast` + `waitForToastsToClear` + `force:true` no save
crítico. 6/6 passes após. O padrão se repete em qualquer save de form Twygo —
documentar evita o re-debug de 15min no próximo spec.
