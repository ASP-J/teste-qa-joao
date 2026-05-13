import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  readonly path = '/dashboard';

  readonly userProfileMenu: Locator;
  readonly welcomeMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.userProfileMenu = page.getByTestId('user_profile_menu');
    this.welcomeMessage = page.getByRole('alert');
  }
}
