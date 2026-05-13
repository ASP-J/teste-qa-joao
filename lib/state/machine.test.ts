import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadState, saveState, advancePhase, nextPhaseAfter } from './machine.js';

describe('state machine', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'state-'));
    path = join(dir, '.state.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns initial state when file missing', () => {
    const s = loadState(path);
    expect(s.lastPhase).toBe('init');
    expect(s.version).toBe(1);
  });

  it('persists advanced phase', () => {
    saveState(path, advancePhase(loadState(path), 'phase-1'));
    const s = loadState(path);
    expect(s.lastPhase).toBe('phase-1');
    expect(s.completedAt).toBeDefined();
  });

  it('rejects backward phase transition', () => {
    const s = advancePhase(loadState(path), 'phase-3');
    saveState(path, s);
    expect(() => advancePhase(loadState(path), 'phase-1')).toThrow(/regress/i);
  });

  it('rejects same-phase transition (idempotent guard)', () => {
    const s = advancePhase(loadState(path), 'phase-2');
    expect(() => advancePhase(s, 'phase-2')).toThrow();
  });

  it('nextPhaseAfter returns the successor', () => {
    expect(nextPhaseAfter('init')).toBe('preflight');
    expect(nextPhaseAfter('phase-3')).toBe('phase-4');
    expect(nextPhaseAfter('done')).toBeNull();
  });
});
