import { describe, expect, it } from 'vitest';
import { normalizeInput } from './index.js';

describe('normalizeInput', () => {
  it('dispatches to MD parser by extension', async () => {
    const out = await normalizeInput('tests/fixtures/inputs/feature-prd-completo.md');
    expect(out.featureName).toBe('Ativar Painéis de Widgets');
  });

  it('dispatches to TXT parser', async () => {
    const out = await normalizeInput('tests/fixtures/inputs/feature-ac-list-cru.txt');
    expect(out.featureName).toBe('Recuperar senha');
  });

  it('rejects unknown extensions', async () => {
    await expect(normalizeInput('foo.xlsx')).rejects.toThrow(/formato/i);
  });
});
