---
name: interagir-switch-chakra-twygo
description: Switches Chakra (`<label data-test-id="..." class="chakra-switch">` envolvendo `<input type="checkbox">` oculto) exigem 2 cuidados conjuntos pra clique funcionar — (1) o label intercepta pointer events do input, então click no `role=checkbox` dá timeout; (2) em drawers altos (Configurações do widget, etc), o label fica fora do viewport e mesmo `force:true` falha com "Element is outside of the viewport". Padrão canônico: helper `setSwitch(locator, on)` idempotente que faz `scrollIntoViewIfNeeded()` + `click({force:true})` no label. Use ao gerar/healing specs que interagem com switches Chakra em qualquer drawer/form Twygo.
version: 1.0.0
---

# interagir-switch-chakra-twygo

## Sintoma canônico

### 1. Click no `role=checkbox` dá timeout

```
TimeoutError: locator.click: Timeout 30000ms exceeded
Call log:
  - waiting for getByRole('checkbox', { name: 'Mostrar título' })
```

Chakra renderiza switch como:
```html
<label data-test-id="widget-settings-name-enabled-switch" data-checked="" class="chakra-switch">
  <input type="checkbox" class="chakra-switch__input" />
  <span class="chakra-switch__track">…</span>
</label>
```

O `<input>` interno é visualmente oculto (`opacity: 0; position: absolute`).
Click direto no `<input>` falha — o `<label>` captura o pointer event primeiro,
mas Playwright tenta clicar no input invisível.

### 2. `force:true` no label dá "outside of viewport"

```
Error: locator.click: Element is outside of the viewport
  - locator resolved to <label data-test-id="..." class="chakra-switch">
  - attempting click action
    - scrolling into view if needed
    - done scrolling
```

Em drawers altos (ex.: "Configurações do widget" com 4 grupos: switch título +
input título + switch ícone + grid ícones), o último switch fica abaixo do
fold. Playwright loga "done scrolling" mas o click coordinate cai fora do
viewport — falha mesmo com `force:true`.

## Padrão canônico

### Page Object: helper `setSwitch()` idempotente

```ts
// projects/<slug>/pages/<Page>.ts
async setSwitch(locator: Locator, on: boolean): Promise<void> {
  const isOn = (await locator.getAttribute('data-checked')) !== null;
  if (isOn !== on) {
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ force: true });
  }
}
```

**3 propriedades essenciais**:

1. **Idempotente** — só clica se o estado atual difere do desejado. Switch já
   ligado + `setSwitch(true)` = no-op. Evita "toggle ao contrário" se o spec
   rodar em estado pré-existente.
2. **`scrollIntoViewIfNeeded()`** — resolve "Element is outside of the
   viewport". Chama explicitamente antes do click, mesmo que Playwright tente
   sozinho — em drawers nested o auto-scroll é parcial.
3. **`click({ force: true })`** — bypassa actionability checks (`<label>`
   intercepta pointer event do `<input>` filho, mas isso é exatamente o
   comportamento que queremos).

### Locator do switch: prefira `data-test-id` no label

```ts
// ✅ certo — pega o <label> diretamente
getWidgetSettingsNameSwitch(): Locator {
  return this.page.locator('[data-test-id="widget-settings-name-enabled-switch"]');
}

// ❌ errado — pega o <input> oculto; click vai falhar
getWidgetSettingsNameSwitch(): Locator {
  return this.page.getByRole('checkbox', { name: 'Mostrar título' });
}
```

### Asserção de estado: use `data-checked` no label

```ts
// ✅ certo — label tem data-checked="" quando ON, atributo ausente quando OFF
await expect(painelForm.getWidgetSettingsNameSwitch()).toHaveAttribute('data-checked', '');
await expect(painelForm.getWidgetSettingsNameSwitch()).not.toHaveAttribute('data-checked', '');

// ❌ errado — checkbox interno tem `aria-checked` mas access depende do role
await expect(painelForm.getWidgetSettingsNameSwitch()).toBeChecked();
```

`toBeChecked()` resolve no `<input>` interno, que está fora do escopo do locator
do label. Pra robustez, asserir no `data-checked` do próprio label.

## Onde isso aparece em Twygo

- Drawer "Configurações do widget" — switch "Mostrar título", "Mostrar ícone"
- Form de painel (aba Identificação) — switch "Painel ativo"
- Listagem de painéis (toggle ativo/inativo) — switch por linha
- Form de Modo de Uso — switches de visibilidade
- Painel form/aba Layouts — switch "Permitir reorganizar widgets"

Qualquer switch Chakra do produto Twygo segue o mesmo padrão DOM — sempre
`<label data-test-id>` + `<input>` oculto.

## Anti-patterns

- ❌ **`.check()` ou `.uncheck()`** — fazem actionability check completo;
  falham porque o input está oculto.
- ❌ **Click no `<input>` filho** via XPath `label[@data-test-id="..."]/input` —
  mesmo problema, o input é `opacity: 0`.
- ❌ **`page.evaluate(() => label.click())`** — funciona, mas perde a
  observabilidade do Playwright (sem trace, sem screenshot do click). Use
  só como último recurso, e adicione comentário WHY (anti-pattern D).
- ❌ **`force:true` SEM scrollIntoViewIfNeeded em drawers altos** — falha
  com "outside of viewport". A ordem é: scroll → force click.
- ❌ **Click 2× pra "garantir" estado** — não idempotente; se já estava no
  estado desejado, vira no estado errado.
- ❌ **`setTimeout(500)` entre scroll e click** — não resolve "outside of
  viewport"; o problema é coordenada, não timing. Viola regra dura #1.

## Quando o padrão NÃO basta

### Switch readonly/disabled (UI bloqueada por contrato/permissão)

```ts
const switch_ = painelForm.getWidgetSettingsNameSwitch();
const isDisabled = await switch_.getAttribute('data-disabled');
if (isDisabled !== null) {
  // Switch bloqueado — não tente toggle, valide só a presença + estado
  await expect(switch_).toHaveAttribute('data-checked', '');
  return;
}
await painelForm.setSwitch(switch_, true);
```

### Switch que dispara confirmação (modal)

Quando o toggle abre dialog ("Tem certeza?"), `setSwitch` não basta — depois
do click, o estado só muda se o user confirmar. Trate explicitamente:

```ts
await painelForm.setSwitch(switch_, false);
await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
await expect(switch_).not.toHaveAttribute('data-checked', '');
```

## Anti-pattern relacionado (CLAUDE.md §7.6)

Não inline a lógica de switch no `test()` — anti-pattern C (POM-only). O
helper `setSwitch` vai na Page Object correspondente, mesmo que seja usado
em 1 só spec. Se o switch é específico de uma página (ex.: Painel form), o
método vai naquele Page Object; se é genérico (vários Page Objects compartilham
switches Chakra), considere mover pra `src/pages/BasePage.ts`.

## Por que esta skill existe

2026-05-11, suíte "Editar/Excluir widgets" do projeto widgets — TC6
("Switches 'Mostrar título' e 'Mostrar ícone' desligados") falhou no 1º run
com "Element is outside of the viewport" no setSwitch original (sem
scrollIntoViewIfNeeded). Fix: adicionar scroll explícito antes do force click.
6/6 passes após.

Antes desta skill: cada Page Object podia ter sua própria variação de `click`
em switch (alguns com force, alguns sem, alguns com scrollIntoView). O padrão
3-em-1 (idempotente + scroll + force) cobre todos os casos observados em
Twygo até hoje. Generator que ler esta skill emite `setSwitch` correto de
primeira.
