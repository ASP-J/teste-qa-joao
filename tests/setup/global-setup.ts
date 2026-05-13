import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createLogger } from '../../src/utils/logger.js';
import { LoginPage } from '../../src/pages/LoginPage.js';
import { getActiveEnv } from '../../src/utils/environment.js';

const log = createLogger('global-setup');

const STORAGE_PATH = resolve(process.cwd(), 'outputs/.auth/storage.json');
const STORAGE_TTL_MS = 30 * 60 * 1000;

function isStorageFresh(path: string): boolean {
  if (!existsSync(path)) return false;
  const ageMs = Date.now() - statSync(path).mtimeMs;
  if (ageMs > STORAGE_TTL_MS) return false;
  try {
    const j = JSON.parse(readFileSync(path, 'utf-8'));
    return Array.isArray(j.cookies) && j.cookies.length > 0;
  } catch {
    return false;
  }
}

async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env.SKIP_GLOBAL_LOGIN === '1') {
    log.info('SKIP_GLOBAL_LOGIN=1 — pulando login global');
    return;
  }

  if (isStorageFresh(STORAGE_PATH)) {
    log.info(`storageState reutilizado (${STORAGE_PATH})`);
    return;
  }

  const { name, entry } = getActiveEnv();
  log.info(`Login global "${name}" em ${entry.baseUrl}users/login...`);

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: entry.baseUrl, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    await page.goto('/users/login');
    await loginPage.login(entry.credentials.email, entry.credentials.password);
    await page.waitForURL((url) => !url.pathname.startsWith('/users/login'), { timeout: 30_000 });

    mkdirSync(dirname(STORAGE_PATH), { recursive: true });
    await context.storageState({ path: STORAGE_PATH });
    log.info(`storageState gravado (${STORAGE_PATH})`);
  } finally {
    await browser.close();
  }
}

export function storageStateIsFresh(): boolean {
  return isStorageFresh(STORAGE_PATH);
}

export function invalidateStorageState(): void {
  if (existsSync(STORAGE_PATH)) {
    writeFileSync(STORAGE_PATH, '{"cookies":[],"origins":[]}');
  }
}

export default globalSetup;
