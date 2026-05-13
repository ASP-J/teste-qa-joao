import { marked } from 'marked';
import type { NormalizedInput, AcCandidate } from '../types.js';

const AC_LINE = /^AC-?(\d+)[:\s-]\s*(.+)$/i;

type Section = 'objetivo' | 'contexto' | 'acs' | 'anexos' | null;

function classifyHeading(text: string): Section {
  const t = text.toLowerCase();
  if (/objetivo/.test(t)) return 'objetivo';
  if (/(contexto|pré-condi|pre-condi|precondi)/.test(t)) return 'contexto';
  if (/(\bacs?\b|crit[ée]rios|cen[áa]rios|aceitação|aceitacao)/.test(t)) return 'acs';
  if (/(anexos|refer[êe]ncias|links)/.test(t)) return 'anexos';
  return null;
}

export function parseMd(raw: string): NormalizedInput {
  const tokens = marked.lexer(raw);

  let featureName = '';
  let objetivo: string | null = null;
  const contexto: string[] = [];
  const acs: AcCandidate[] = [];
  const anexos: string[] = [];

  let currentSection: Section = null;

  for (const tok of tokens) {
    if (tok.type === 'heading') {
      if (tok.depth === 1 && !featureName) {
        featureName = tok.text.trim();
      }
      currentSection = classifyHeading(tok.text);
      continue;
    }

    if (tok.type === 'paragraph' && currentSection === 'objetivo' && !objetivo) {
      objetivo = tok.text.trim();
      continue;
    }

    if (tok.type === 'list') {
      for (const item of tok.items) {
        const text = item.text.trim();
        if (currentSection === 'contexto') {
          contexto.push(text);
        } else if (currentSection === 'acs') {
          const m = text.match(AC_LINE);
          if (m) {
            acs.push({
              id: `AC-${m[1].padStart(2, '0')}`,
              raw: m[2].trim(),
              inferred: false,
            });
          }
        } else if (currentSection === 'anexos') {
          anexos.push(text);
        }
      }
    }
  }

  const gaps: string[] = [];
  if (!featureName) gaps.push('Nome da feature não identificado.');
  if (!objetivo) gaps.push('Objetivo não informado.');
  if (contexto.length === 0) gaps.push('Pré-condições/contexto não listados.');
  if (acs.length === 0) gaps.push('Nenhum AC identificado.');

  return {
    featureName,
    objetivo,
    contexto,
    acs,
    gaps,
    anexos,
  };
}
