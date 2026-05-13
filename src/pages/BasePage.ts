import type { Page, Locator, Response } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  abstract readonly path: string;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<Response | null> {
    return this.page.goto(this.path);
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `outputs/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  getByRoleName(role: Parameters<Page['getByRole']>[0], name: string): Locator {
    return this.page.getByRole(role, { name });
  }
}
