import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  readonly path = '/users/login';

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByRole('textbox', { name: 'Login' });
    this.passwordInput = page.getByRole('textbox', { name: 'Senha' });
    this.loginButton = page.getByRole('button', { name: 'Entrar' });
    this.errorAlert = page.getByRole('alert');
  }

  /**
   * Login idempotente: se a página atual NÃO está em /users/login (já
   * autenticada via storageState do globalSetup), retorna sem fazer nada.
   * Isso permite que specs antigos chamem `loginPage.login(...)` sem custo
   * quando o storageState global já cobriu autenticação.
   */
  async login(email: string, password: string): Promise<void> {
    if (!this.page.url().includes('/users/login')) {
      // Já autenticado — provavelmente via storageState global
      return;
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await Promise.all([
      this.page.waitForURL(
        (url) => !url.pathname.startsWith('/users/login'),
        { timeout: 30000 },
      ),
      this.loginButton.click(),
    ]);
  }

  async getErrorMessage(): Promise<string> {
    return (await this.errorAlert.textContent())?.trim() ?? '';
  }
}
