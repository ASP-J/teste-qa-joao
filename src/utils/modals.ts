import type { Page, Locator } from '@playwright/test';

/**
 * Fecha modais oportunistas que aparecem em sessões do Twygo e podem
 * bloquear cliques em elementos da página principal.
 *
 * Lista cobertora (atualizada conforme aparecem):
 *
 * 1. **NPS Sofia** — pesquisa "Em uma escala de 1 a 10, o quanto você
 *    indicaria a Twygo a um amigo ou familiar?". Aparece após login se
 *    a org/usuário ainda não respondeu este ciclo. Mosta 10 botões
 *    (1-10), campo "Justifique por favor" e botões "Salvar" /
 *    "Pergunte depois". Tem também o "X" no canto sup direito.
 *
 *    **Estratégia:** clicar em "Pergunte depois" — opção mais limpa,
 *    snooza por 7 dias sem registrar score. "X" também funciona mas em
 *    alguns ambientes ele só dispensa visualmente sem snooze, e o
 *    modal volta na próxima navegação.
 *
 * 2. **"Continuar mesmo assim"** — modal de aviso de sessão duplicada.
 *
 * 3. **Banner Sofia (legacy)** — versões antigas tinham o NPS num banner
 *    fixo no canto, com botão "Close". Mantido por compat.
 *
 * O modal NPS pode aparecer alguns segundos APÓS o `goto` (gatilho de
 * inactivity). Por isso o helper itera até `maxAttempts` vezes com
 * timeouts curtos. Sem nada visível pra fechar, retorna imediato (custa
 * ~50ms — é seguro chamar de mais).
 *
 * **Onde chamar:**
 *  - Logo após `page.goto(...)` em métodos do Page Object que iniciam
 *    navegação (ex: `goToList()`, `clickMenuLink()`)
 *  - Após login no globalSetup (já cobre a primeira aparição na sessão,
 *    mas o modal pode reaparecer em sessões longas)
 *  - Em `test.beforeEach()` de specs sensíveis a interferência de modal
 *
 * Documentação adicional na skill `fechar-modais-twygo`.
 */
/**
 * Navegação segura: `page.goto` com `waitUntil: 'domcontentloaded'` (não o
 * default `load`) + `dismissCommonModals` imediatamente após. NPS Sofia
 * aparece DURANTE o load do app e BLOQUEIA o evento `load` de firar — o
 * `page.goto` default esgota 30s mesmo com modal visível. Com `domcontentloaded`
 * retornamos cedo, dismiss limpa o modal, app continua carregando em
 * background sem travar o spec.
 *
 * **Regra dura**: TODO `page.goto` em Page Objects Twygo deve passar pelo
 * `safeGoto` — exceto em testes específicos do fluxo de login (auth/).
 * Documentado no CLAUDE.md raiz do monorepo.
 *
 * Quando NÃO usar:
 *  - Spec testando o próprio NPS modal (precisa que ele apareça e não seja
 *    dismissado)
 *  - Tests da pasta `tests/auth/` que validam o fluxo de login
 *  - Navegações dentro do mesmo Page Object onde o modal já foi tratado
 *    no Page Object anterior (raro — geralmente é mais seguro chamar de novo)
 */
export async function safeGoto(
  page: Page,
  url: string,
  opts: { dismiss?: boolean; timeout?: number } = {},
): Promise<void> {
  const dismiss = opts.dismiss ?? true;
  const timeout = opts.timeout ?? 30_000;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (err) {
    const msg = (err as Error).message ?? '';
    // Flakiness comum em VPN/wifi instável: rede muda durante a navegação
    // (ERR_NETWORK_CHANGED), conexão é resetada, ou DNS pisca. 1 retry após
    // pequeno backoff resolve o caso transitório sem mascarar falha real
    // (segunda tentativa também propaga o erro se persistir). NÃO usar
    // page.waitForTimeout (regra dura #1) — setTimeout do node é fora do
    // domínio Playwright e não conta como wait suspeito.
    const isRetriable =
      /net::ERR_(NETWORK_CHANGED|FAILED|TIMED_OUT|CONNECTION_RESET)/i.test(msg) ||
      /Timeout \d+ms exceeded/i.test(msg);
    if (isRetriable) {
      await new Promise((r) => setTimeout(r, 1500));
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    } else {
      throw err;
    }
  }
  if (dismiss) {
    await dismissCommonModals(page);
  }
}

export async function dismissCommonModals(
  page: Page,
  opts: { maxAttempts?: number } = {},
): Promise<void> {
  const maxAttempts = opts.maxAttempts ?? 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let clickedAny = false;

    const candidates: Locator[] = [
      // 1. NPS Sofia atual — preferir "Pergunte depois" (snooze definitivo)
      //    sobre "X". Identificamos pelo botão homônimo, não pelo nome do dialog
      //    (que pode não ter aria-label estável).
      page.getByRole('button', { name: /Pergunte depois/i }).first(),

      // 2. NPS — fallback no "X" (close). getByRole('button',{name:'close'})
      //    bate em qualquer dialog visível, então restringimos a dialog que
      //    contenha o texto característico ("Em uma escala de 1 a 10").
      page
        .getByRole('dialog')
        .filter({ hasText: /Em uma escala de 1 a 10/i })
        .getByRole('button', { name: /close|fechar|×/i })
        .first(),

      // 3. NPS legacy — banner com "Sofia" no nome
      page.getByRole('dialog', { name: /sofia/i }).getByRole('button', { name: /close/i }),

      // 4. Modal "Continuar mesmo assim" (sessão duplicada)
      page.getByRole('button', { name: /Continuar mesmo assim/i }).first(),
      page.getByRole('link', { name: /Continuar mesmo assim/i }).first(),

      // 5. Botão "Close" genérico em qualquer dialog visível (último recurso —
      //    cobre modais novos não mapeados; se fechar coisa errada, o teste
      //    falha logo depois e o ajuste é específico por nome).
      page.getByRole('dialog').getByRole('button', { name: /^close$/i }).first(),
    ];

    for (const cand of candidates) {
      const visible = await cand.isVisible().catch(() => false);
      if (visible) {
        await cand.click({ timeout: 1500 }).catch(() => null);
        // Espera o próprio botão sair do DOM/visibilidade — confirma que
        // o modal fechou e evita loop "clicar várias vezes no mesmo".
        await cand.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => null);
        clickedAny = true;
      }
    }

    // Sem nada visível pra fechar: sai. Caso contrário, dá uma volta cobrindo
    // modais sequenciais (ex: NPS aparece depois de fechar "Continuar...").
    if (!clickedAny) return;
  }
}
