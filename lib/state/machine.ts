import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type Phase =
  | 'init'
  | 'preflight'
  | 'phase-1'
  | 'phase-2'
  | 'phase-3'
  | 'phase-4'
  | 'phase-5'
  | 'phase-6'
  | 'done';

const ORDER: readonly Phase[] = [
  'init',
  'preflight',
  'phase-1',
  'phase-2',
  'phase-3',
  'phase-4',
  'phase-5',
  'phase-6',
  'done',
] as const;

export interface State {
  lastPhase: Phase;
  completedAt?: string;
  version: 1;
  notes?: string;
}

export function loadState(path: string): State {
  if (!existsSync(path)) {
    return { lastPhase: 'init', version: 1 };
  }
  return JSON.parse(readFileSync(path, 'utf8')) as State;
}

export function saveState(path: string, state: State): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf8');
}

export function advancePhase(current: State, next: Phase): State {
  const ci = ORDER.indexOf(current.lastPhase);
  const ni = ORDER.indexOf(next);
  if (ni <= ci) {
    throw new Error(`Transição inválida (regressão): ${current.lastPhase} → ${next}`);
  }
  return {
    ...current,
    lastPhase: next,
    completedAt: new Date().toISOString(),
  };
}

export function nextPhaseAfter(current: Phase): Phase | null {
  const i = ORDER.indexOf(current);
  if (i === -1 || i >= ORDER.length - 1) return null;
  return ORDER[i + 1]!;
}
