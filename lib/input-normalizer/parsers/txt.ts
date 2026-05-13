import type { NormalizedInput, AcCandidate } from '../types.js';

const FEATURE_LINE = /^(feature|funcionalidade|título|titulo):\s*(.+)$/i;
const AC_LINE = /^AC-?(\d+)[:\s-]\s*(.+)$/i;
const HEADING_LINE = /^#\s+(.+)$/;

export function parseTxt(raw: string): NormalizedInput {
  let featureName = '';
  const acs: AcCandidate[] = [];
  const gaps: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const fm = trimmed.match(FEATURE_LINE);
    if (fm && !featureName) {
      featureName = fm[2]!.trim();
      continue;
    }

    const hm = trimmed.match(HEADING_LINE);
    if (hm && !featureName) {
      featureName = hm[1]!.trim();
      continue;
    }

    const am = trimmed.match(AC_LINE);
    if (am) {
      acs.push({
        id: `AC-${am[1]!.padStart(2, '0')}`,
        raw: am[2]!.trim(),
        inferred: false,
      });
    }
  }

  if (!featureName) gaps.push('Nome da feature não identificado.');
  if (acs.length === 0) gaps.push('Nenhum AC identificado no texto.');

  return {
    featureName,
    objetivo: null,
    contexto: [],
    acs,
    gaps,
    anexos: [],
  };
}
