import { describe, expect, it } from 'vitest';
import { emitNormalizedMd } from './emitter.js';

describe('emitNormalizedMd', () => {
  it('renders all sections in canonical order', () => {
    const md = emitNormalizedMd({
      featureName: 'Foo',
      objetivo: 'Fazer X',
      contexto: ['logado'],
      acs: [{ id: 'AC-01', raw: 'Faz Y', inferred: false }],
      gaps: ['perfil indefinido'],
      anexos: [],
    });

    expect(md).toMatch(/^# Foo/m);
    expect(md).toMatch(/## Objetivo\n\nFazer X/m);
    expect(md).toMatch(/## Contexto\/Pré-condições/m);
    expect(md).toMatch(/^- logado/m);
    expect(md).toMatch(/## ACs detectados/m);
    expect(md).toMatch(/^- \*\*AC-01\*\*: Faz Y/m);
    expect(md).toMatch(/## Gaps detectados/m);
    expect(md).toMatch(/^- perfil indefinido/m);
  });

  it('marks empty sections clearly', () => {
    const md = emitNormalizedMd({
      featureName: '',
      objetivo: null,
      contexto: [],
      acs: [],
      gaps: [],
      anexos: [],
    });

    expect(md).toContain('(feature sem título)');
    expect(md).toMatch(/_não informado/);
    expect(md).toMatch(/_nenhum AC identificado/);
    expect(md).toMatch(/_nenhum gap detectado/);
    expect(md).toMatch(/_nenhum anexo_/);
  });
});
