import mammoth from 'mammoth';
import { parseMd } from './md.js';
import type { NormalizedInput } from '../types.js';

export async function parseDocx(buf: Buffer): Promise<NormalizedInput> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return parseMd(value);
}
