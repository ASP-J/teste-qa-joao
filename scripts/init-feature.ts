/**
 * scripts/init-feature.ts
 *
 * Materializa as fases iniciais do pipeline pro orchestrator não precisar
 * fazer file I/O manual. Invocado pela skill `ler-feature-doc` ou direto
 * por quem quiser bootstrapar uma feature.
 *
 * Comportamento:
 *  1. Resolve slug a partir do path do input (basename sem extensão, kebab-case, diacríticos removidos).
 *  2. Cria `outputs/<slug>/` se não existe.
 *  3. Roda o normalizer → grava `normalized-input.md`.
 *  4. Inicializa `.state.json` com `lastPhase: 'phase-1'`.
 *
 * Uso:
 *   npx tsx scripts/init-feature.ts <path-to-input>
 *
 * Output (stdout, JSON):
 *   { "slug": "ativar-paineis", "outputDir": "outputs/ativar-paineis",
 *     "normalizedPath": "outputs/ativar-paineis/normalized-input.md",
 *     "statePath": "outputs/ativar-paineis/.state.json",
 *     "summary": { "acs": 3, "gaps": 0, "contexto": 2 } }
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { normalizeInput } from '../lib/input-normalizer/index.js';
import { emitNormalizedMd } from '../lib/input-normalizer/emitter.js';
import { loadState, saveState, advancePhase } from '../lib/state/machine.js';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main(): Promise<void> {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error('Uso: tsx scripts/init-feature.ts <path-to-input>');
    process.exit(1);
  }

  const baseName = basename(inputPath, extname(inputPath));
  const slug = slugify(baseName);
  const outputDir = resolve(process.cwd(), 'outputs', slug);
  const normalizedPath = resolve(outputDir, 'normalized-input.md');
  const statePath = resolve(outputDir, '.state.json');

  mkdirSync(outputDir, { recursive: true });

  const normalized = await normalizeInput(inputPath);
  writeFileSync(normalizedPath, emitNormalizedMd(normalized), 'utf8');

  let state = loadState(statePath);
  state = advancePhase(state, 'preflight');
  state = advancePhase(state, 'phase-1');
  saveState(statePath, state);

  const result = {
    slug,
    outputDir: `outputs/${slug}`,
    normalizedPath: `outputs/${slug}/normalized-input.md`,
    statePath: `outputs/${slug}/.state.json`,
    summary: {
      acs: normalized.acs.length,
      gaps: normalized.gaps.length,
      contexto: normalized.contexto.length,
      anexos: normalized.anexos.length,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('ERRO init-feature:', message);
  process.exit(1);
});
