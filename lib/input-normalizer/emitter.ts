import type { NormalizedInput } from './types.js';

export function emitNormalizedMd(n: NormalizedInput): string {
  const out: string[] = [];
  out.push(`# ${n.featureName || '(feature sem título)'}`);
  out.push('');
  out.push('## Objetivo');
  out.push('');
  out.push(n.objetivo ?? '_não informado — preencher no Q&A_');
  out.push('');
  out.push('## Contexto/Pré-condições');
  out.push('');
  if (n.contexto.length === 0) {
    out.push('_não informado — preencher no Q&A_');
  } else {
    for (const c of n.contexto) out.push(`- ${c}`);
  }
  out.push('');
  out.push('## ACs detectados');
  out.push('');
  if (n.acs.length === 0) {
    out.push('_nenhum AC identificado — preencher no Q&A_');
  } else {
    for (const ac of n.acs) {
      out.push(`- **${ac.id}**: ${ac.raw}${ac.inferred ? ' _(inferido)_' : ''}`);
    }
  }
  out.push('');
  out.push('## Gaps detectados');
  out.push('');
  if (n.gaps.length === 0) {
    out.push('_nenhum gap detectado automaticamente_');
  } else {
    for (const g of n.gaps) out.push(`- ${g}`);
  }
  out.push('');
  out.push('## Anexos');
  out.push('');
  if (n.anexos.length === 0) {
    out.push('_nenhum anexo_');
  } else {
    for (const a of n.anexos) out.push(`- ${a}`);
  }
  out.push('');
  return out.join('\n');
}
