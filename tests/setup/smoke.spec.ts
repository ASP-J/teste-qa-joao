/**
 * Smoke universal — valida infra antes de invocar a pipeline de bootstrap.
 *
 * Roda em ~10s e cobre:
 * 1. globalSetup conseguiu logar e gravou storageState válido.
 * 2. baseURL responde.
 * 3. Storage é aceito (não cai em /users/login).
 * 4. Landing autenticada (`/play`) carrega.
 *
 * Falha aqui = NÃO prosseguir. O orchestrator pode invocar este smoke
 * antes da fase 3 (recon) pra evitar gastar Q&A sem ambiente funcional.
 */
import { test, expect } from '@playwright/test';
import { safeGoto } from '../../src/utils/modals.js';

test.describe('Smoke — Infra Twygo', () => {
  test('Login global aceita storageState e landing pós-login carrega', async ({ page }) => {
    await safeGoto(page, '/play?menu_id=play');
    await expect(page).not.toHaveURL(/\/users\/login/);
    await expect(page).toHaveURL(/\/play/);
  });
});
