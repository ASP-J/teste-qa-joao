import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseMd } from './md.js';

describe('parseMd', () => {
  it('extracts feature name, objetivo, contexto, ACs from PRD-style MD', () => {
    const raw = readFileSync('tests/fixtures/inputs/feature-prd-completo.md', 'utf8');
    const out = parseMd(raw);

    expect(out.featureName).toBe('Ativar Painéis de Widgets');
    expect(out.objetivo).toContain('controlar disponibilidade');
    expect(out.contexto).toHaveLength(2);
    expect(out.acs).toHaveLength(3);
    expect(out.acs[0]!.id).toBe('AC-01');
    expect(out.acs[1]!.raw).toContain('modal de bloqueio');
  });

  it('marks gaps when sections missing', () => {
    const out = parseMd('# Só título\n\nnada mais');
    expect(out.gaps.length).toBeGreaterThan(0);
    expect(out.gaps.some((g) => /objetivo/i.test(g))).toBe(true);
  });
});
