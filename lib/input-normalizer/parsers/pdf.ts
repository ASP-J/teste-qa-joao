// @ts-expect-error — pdf-parse não tem types oficiais
import pdfParse from 'pdf-parse';
import { parseMd } from './md.js';
import type { NormalizedInput } from '../types.js';

export async function parsePdf(buf: Buffer): Promise<NormalizedInput> {
  const data = await pdfParse(buf);
  return parseMd(data.text);
}
