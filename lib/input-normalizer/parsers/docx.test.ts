import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parseDocx } from './docx.js';

describe('parseDocx', () => {
  it.skipIf(!existsSync('tests/fixtures/inputs/feature-docx-completo.docx'))(
    'extracts text and routes to MD parser',
    async () => {
      const buf = readFileSync('tests/fixtures/inputs/feature-docx-completo.docx');
      const out = await parseDocx(buf);
      expect(out.featureName.length).toBeGreaterThan(0);
    },
  );

  it('throws on non-docx buffer', async () => {
    await expect(parseDocx(Buffer.from('not a docx'))).rejects.toThrow();
  });
});
