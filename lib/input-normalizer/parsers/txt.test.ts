import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTxt } from './txt.js';

describe('parseTxt', () => {
  it('extracts feature name + ACs from bare AC list', () => {
    const raw = readFileSync('tests/fixtures/inputs/feature-ac-list-cru.txt', 'utf8');
    const out = parseTxt(raw);

    expect(out.featureName).toBe('Recuperar senha');
    expect(out.acs).toHaveLength(3);
    expect(out.acs[0]!.id).toBe('AC-01');
    expect(out.acs[0]!.inferred).toBe(false);
  });

  it('flags gaps when no AC structure detected', () => {
    const out = parseTxt('Algum texto solto sem estrutura.');
    expect(out.gaps.length).toBeGreaterThan(0);
  });
});
