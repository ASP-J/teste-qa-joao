import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { normalizeInput } from './index.js';
import { emitNormalizedMd } from './emitter.js';

async function main(): Promise<void> {
  const [, , inputPath, outPath] = process.argv;
  if (!inputPath || !outPath) {
    console.error('Uso: tsx lib/input-normalizer/cli.ts <input> <out>');
    process.exit(1);
  }
  const normalized = await normalizeInput(inputPath);
  const md = emitNormalizedMd(normalized);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md, 'utf8');
  console.log(`OK normalizado: ${outPath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('ERRO normalizer:', message);
  process.exit(1);
});
