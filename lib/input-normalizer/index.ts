import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parseMd } from './parsers/md.js';
import { parseTxt } from './parsers/txt.js';
import { parsePdf } from './parsers/pdf.js';
import { parseDocx } from './parsers/docx.js';
import type { NormalizedInput } from './types.js';

export async function normalizeInput(path: string): Promise<NormalizedInput> {
  const ext = extname(path).toLowerCase();
  switch (ext) {
    case '.md':
      return parseMd(await readFile(path, 'utf8'));
    case '.txt':
      return parseTxt(await readFile(path, 'utf8'));
    case '.pdf':
      return parsePdf(await readFile(path));
    case '.docx':
      return parseDocx(await readFile(path));
    default:
      throw new Error(`Formato não-suportado: "${ext}". Aceitos: .md, .txt, .pdf, .docx`);
  }
}

export type { NormalizedInput, AcCandidate, SourceFormat } from './types.js';
