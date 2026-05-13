import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * SuperAdmin (Twygo) — área administrativa global em `/admin`.
 *
 * Pré-requisito: usuário precisa estar logado E em perfil "Administrador" na
 * organização (storageState do globalSetup já cobre, contanto que o user do
 * `environment.json` tenha esse acesso). A navegação /admin não exige troca
 * de UI — basta acessar a rota direto.
 *
 * Caminhos canônicos (validados em 2026-05-05 com o usuário):
 * - `/admin` — entrada do Super Admin
 * - `/admin/subscription_plans` — Manutenção da tabela de preços
 *   (na lista, identifique a tabela com coluna "Ativo" = sim e clique em
 *   "Editar" — só pode haver UMA tabela ativa por vez)
 * - `/admin/edit_sys_subscription_settings/{orgId}` — edição direta do
 *   contrato vigente da organização. orgId em environment.json
 *   (`staging.orgId = 36602`, `staging-without-credits.orgId = 36912`).
 *
 * Use sempre os helpers de URL desta classe — não invente caminhos.
 */
export class SuperAdminPage extends BasePage {
  readonly path = '/admin';

  readonly subscriptionMenu: Locator;
  readonly maintainPriceTablesLink: Locator;
  readonly maintainSubscriptionsLink: Locator;
  readonly orgSearchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.subscriptionMenu = page.getByRole('link', { name: /assinaturas?/i });
    this.maintainPriceTablesLink = page.getByRole('link', {
      name: /manuten[çc][ãa]o\s+da\s+tabela\s+de\s+pre[çc]os/i,
    });
    this.maintainSubscriptionsLink = page.getByRole('link', {
      name: /manuten[çc][ãa]o\s+de\s+assinaturas?/i,
    });
    this.orgSearchInput = page.getByPlaceholder(/pesquisa|buscar|nome.*organiza/i);
  }

  /**
   * Acessa /admin direto via URL. Se sessão for válida (storageState global +
   * perfil Administrador), o app carrega o layout do Super Admin imediatamente.
   */
  async openSuperAdmin(): Promise<void> {
    await this.page.goto('/admin');
    await this.waitForReady();
  }

  /**
   * Navega direto para a edição da tabela de preços ativa. Hoje (2026-05-05)
   * o caminho documentado é via UI (Assinaturas > Manutenção da tabela de
   * preços > coluna Ativo > botão Editar), mas o atalho `/admin/subscription_plans`
   * já abre a listagem; cada teste decide se quer iterar pela tabela ativa
   * ou ir direto via deep-link conhecido.
   */
  async openSubscriptionPlans(): Promise<void> {
    await this.page.goto('/admin/subscription_plans');
    await this.waitForReady();
  }

  /**
   * Edita o contrato vigente de uma organização específica via URL direta.
   * O orgId vem de `environment.json[env].orgId` ou
   * `environment.json[env].superAdmin.editContractPath`.
   */
  async openEditContract(orgId: string | number): Promise<void> {
    await this.page.goto(`/admin/edit_sys_subscription_settings/${orgId}`);
    await this.waitForReady();
  }

  /**
   * Em `/admin/subscription_plans`, clica em "Editar" da tabela de preços
   * marcada como "Ativo = Sim". Pode haver apenas UMA tabela ativa por banco.
   * Após o click, navega para o form da tabela ativa (rota interna admin).
   */
  async openActivePriceTable(): Promise<void> {
    await this.openSubscriptionPlans();
    // A row ativa é a única que contém o texto " Sim " (com word boundary).
    // Ignora a header (sem 'Sim') e as inativas (que têm 'Não').
    const activeRow = this.page.getByRole('row', { name: /\bSim\b/ }).first();
    await activeRow.waitFor({ state: 'visible', timeout: 15_000 });
    // Botão "Editar" é um <div role="generic"> (não link/button). getByText
    // com exact captura só "Editar" sem casar com header/coluna.
    await activeRow.getByText('Editar', { exact: true }).first().click();
    // Confirmação obrigatória: dialog "Atenção - Ao editar uma tabela de
    // preços as alterações serão aplicadas a todos as organizações...".
    // O dialog não tem accessible-name padrão. Esperamos o texto "Atenção"
    // ficar visível e clicamos o botão Sim adjacente.
    await this.page.getByText(/aten[çc][ãa]o/i).first().waitFor({ state: 'visible', timeout: 10_000 });
    // Botão Sim do dialog de confirmação. Tem múltiplos botões "Sim" possíveis
    // na página (menus laterais não, mas safety). Limita ao container do dialog
    // (Bootstrap usa `.modal`/`[role=dialog]`). Como o getByRole('button')
    // não resolve o accessible name aqui, usa CSS+text direto.
    const dialogYes = this.page.locator(
      '[role="dialog"] button:has-text("Sim"), .modal button:has-text("Sim"), .modal-dialog button:has-text("Sim")',
    ).first();
    await dialogYes.click({ force: true });
    // Após confirmar, a navegação leva ao form da tabela ativa. Aguarda
    // o texto "Atenção" sumir antes de prosseguir.
    await this.page.getByText(/aten[çc][ãa]o/i).first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => null);
    await this.waitForReady();
  }

  /**
   * Navega via UI: Assinaturas > Manutenção de assinaturas > Pesquisar por
   * nome/ID > Editar/Visualizar > Aba "Contratos" > Editar contrato vigente.
   * Use quando o teste precisa validar a UI de busca; caso contrário prefira
   * `openEditContract(orgId)`.
   */
  async navigateToOrgSubscriptions(orgIdOrName: string | number): Promise<void> {
    await this.openSuperAdmin();
    await this.subscriptionMenu.click();
    await this.maintainSubscriptionsLink.click();
    await this.waitForReady();
    await this.orgSearchInput.fill(String(orgIdOrName));
    await this.page.keyboard.press('Enter');
  }
}
