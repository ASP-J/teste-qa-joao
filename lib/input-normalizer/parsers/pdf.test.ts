import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parsePdf } from './pdf.js';

describe('parsePdf', () => {
  it.skipIf(!existsSync('tests/fixtures/inputs/feature-pdf-completo.pdf'))(
    'extracts text and routes to MD parser',
    async () => {
      const buf = readFileSync('tests/fixtures/inputs/feature-pdf-completo.pdf');
      const out = await parsePdf(buf);
      expect(out.featureName.length).toBeGreaterThan(0);
    },
  );

  it('throws on non-PDF buffer', async () => {
    await expect(parsePdf(Buffer.from('not a pdf'))).rejects.toThrow();
  });
});
