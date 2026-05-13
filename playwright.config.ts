import { defineConfig, devices } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { getActiveEnv } from './src/utils/environment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = getActiveEnv();
const STORAGE_PATH = resolve(__dirname, 'outputs/.auth/storage.json');

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/setup/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: env.entry.baseUrl,
    headless: true,
    actionTimeout: env.entry.timeout,
    navigationTimeout: env.entry.timeout,
    testIdAttribute: 'data-test-id',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: STORAGE_PATH,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
