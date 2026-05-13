---
name: fechar-modais-twygo
description: Como tratar modais oportunistas do Twygo (NPS Sofia "Em uma escala de 1 a 10", banner de sessão duplicada "Continuar mesmo assim", popups de feature) que aparecem em cima da UI principal e bloqueiam interações em specs Playwright. Use quando um spec falhar com timeout em click/fill que parece "elemento estava lá mas não clicou", e o screenshot da falha mostrar dialog/modal por cima do conteúdo.
version: 1.0.0
---

# fechar-modais-twygo

## Sintoma canônico

Spec falha com `locator.click: Timeout 30000ms` ou `expect(locator).toBeVisible() failed` em elemento que **claramente existe** no DOM (você vê no screenshot) mas o click não dispara. Causa: modal/dialog oportunista (NPS, sessão, feature popup) renderizou por cima e capturou o click.

Screenshot típico mostra: a página alvo carregada **com um overlay escuro** + dialog branco no centro (texto "Em uma escala de 1 a 10..." + 10 botões + "Salvar"/"Pergunte depois"). O Playwright clicou no overlay/dialog em vez do alvo.

## Modais cobertos

| Modal | Quando aparece | Como dismissar |
|---|---|---|
| **NPS Sofia** ("Em uma escala de 1 a 10, o quanto você indicaria a Twygo...") | Após login se a org/usuário ainda não respondeu este ciclo. Pode aparecer SEGUNDOS após `goto`, gatilho de inactivity. | Clicar **"Pergunte depois"** (snooza por 7 dias). Como fallback, "X" no canto sup direito. |
| **"Continuar mesmo assim"** | Sessão duplicada ou aviso de browser. | Clicar no botão homônimo. |
| **Banner Sofia (legacy)** | Versões antigas tinham NPS num banner fixo no canto. | Clicar "Close" dentro do dialog `name=/sofia/i`. |
| **Genérico — qualquer dialog c/ "Close"** | Modais novos não mapeados ainda. | Último recurso: clicar `getByRole('dialog').getByRole('button', { name: 'close' })`. |

## Como usar (helper canônico)

`src/utils/modals.ts#dismissCommonModals()` cobre todos os 4 casos com fallbacks em ordem.

### Onde plugar

**1. Em métodos de Page Object que iniciam navegação (`goto` ou click em link de nav):**

```ts
// projects/widgets/pages/PaineisListPage.ts
import { dismissCommonModals } from '../../../src/utils/modals.js';

async goToList(): Promise<void> {
  await this.page.goto(`/o/${getOrgId()}/use_modes?tab=panels-tab`);
  await dismissCommonModals(this.page);    // ← antes de qualquer waitFor/click
  await this.page.getByRole('tab', { name: 'Painéis' }).waitFor();
}

async clickMenuLink(): Promise<void> {
  await this.page.locator('#menu a').click();
  await this.page.waitForURL(/\/use_modes/);
  await dismissCommonModals(this.page);    // ← após nav, antes de retornar
}
```

**2. Em métodos que abrem um form (`openXForm`) — *obrigatório* desde 2026-05-11:**

```ts
async openNewPanelForm(): Promise<void> {
  await this.page.goto(`/o/${getOrgId()}/panels/new`);
  await dismissCommonModals(this.page);    // ← antes do waitFor do input
  await this.getNewPanelNameInput().waitFor();
}
```

**3. Em métodos que disparam submit de form (`submitXForm`) — *defesa em profundidade*:**

```ts
async submitNewPanelForm(): Promise<void> {
  await dismissCommonModals(this.page);    // ← imediatamente antes do click
  await this.getNewPanelSaveButton().click();
  await this.page.waitForURL(/\/panels\/\d+\/edit/);
}
```

NPS Sofia pode aparecer por *inactivity* SEGUNDOS depois do `goto` — entre o `fill` do nome e o click no Salvar dá tempo do modal renderizar. Dismiss na entrada (open) e na saída (submit) cobre o intervalo.

**4. Em métodos que clicam em controles sensíveis a interceptação (toggle/switch/checkbox em listagem):**

```ts
async toggleActiveByName(name: string): Promise<void> {
  const before = await this.getActiveStateByName(name);
  await dismissCommonModals(this.page);    // ← antes do click no switch
  await this.getRowActiveSwitchLabelByName(name).click();
  // ... polling de toggle/modal ...
}
```

Sem isso, o click cai no overlay do NPS e o polling subsequente nunca vê toggled NEM modal de bloqueio — termina em `pending` (sintoma típico: "aguardando toggle ou modal após click no switch de '...'").

**5. Em `test.beforeEach()` quando o spec é especialmente sensível:**

```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/o/.../use_modes');
  await dismissCommonModals(page);
});
```

**6. NÃO chame em loop dentro do mesmo test** — o helper é idempotente (sem nada visível, retorna em ~50ms), mas se você está chamando 5x você provavelmente tá lutando com outro problema.

## Anti-patterns

- ❌ **Usar `force: true` no click pra "passar por cima" do modal.** Mascara o sintoma; o teste passa mas valida click no overlay, não no elemento real.
- ❌ **`page.keyboard.press('Escape')` cego.** O Sofia não fecha com ESC; fecha só por click em "Pergunte depois" ou "X".
- ❌ **`page.locator('.modal-backdrop').click()`.** Click no backdrop não fecha NPS Sofia (modal é "blocking" — exige interação com botão).
- ❌ **Esperar `dialog` desaparecer via `waitFor({ state: 'hidden' })` sem ter clicado em algo.** Vai timeout em 30s — o modal não desaparece sozinho.

## Quando o helper NÃO resolve (atualizar este skill)

Se um spec ainda falha por modal e o screenshot mostra dialog **diferente** dos 4 mapeados (ex: nova feature popup, modal de upgrade de plano, banner de novo pacote):

1. Capture o seletor real do botão de fechar (testa via DevTools: `document.querySelector('button[aria-label="..."]')` ou `getByRole('button', { name: '...' })`).
2. Adicione o candidate na lista de `src/utils/modals.ts` — em ordem de prioridade (mais específico primeiro).
3. **Atualize esta skill** com o novo modal na tabela acima.
4. Comite junto com o spec que motivou a descoberta.

## Por que esta skill existe

Modal NPS Sofia foi **a causa principal de 7 das 8 falhas** na primeira rodada da suíte "Listagem de painéis" do projeto widgets (2026-05-08). Aparecia logo após login e capturava todos os clicks de navegação.

Antes desta skill: cada spec resolvia individualmente (alguns specs do creditos-fase-02 chamavam `dismissCommonModals` manualmente, outros não chamavam). Agora a regra é: **plugar no Page Object da feature** — assim todos os specs herdam.

**Segunda rodada (2026-05-11, suíte "Ativar / Inativar painel"):** o `goToList()` já tinha o dismiss, mas `openNewPanelForm()`, `submitNewPanelForm()`, `associatePanelToMenu()` e `toggleActiveByName()` **não tinham**. Resultado: 3 das 4 falhas críticas explodiram no `beforeAll` → `createPanel()` com o stack trace canônico (`chakra-modal__content-container … intercepts pointer events` em `[data-test-id="panel-form-save-button"]`); a 4ª caiu no polling de `toggleActiveByName` ("aguardando toggle ou modal após click no switch") quando o NPS reapareceu por inactivity entre `goToList` e o click no switch.

**Regra derivada (item 2-4 da seção "Onde plugar"):** o dismiss não é só "após nav". É também **antes de qualquer submit de form** e **antes de qualquer click em controle interativo de listagem** (switch/toggle/action icon). Repetir é barato; esquecer é caro.

## Anti-pattern relacionado (CLAUDE.md §7.6)

Quando você adicionar `dismissCommonModals(page)` num Page Object, **NÃO** adicione comentário tipo `// fecha modal NPS` (anti-pattern D — comentário WHAT). O nome do método já é auto-explicativo. Comentário só vai se for invariante não-óbvia (ex: "modal só aparece em first login da org").
