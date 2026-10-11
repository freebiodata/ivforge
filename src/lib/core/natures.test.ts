import { describe, expect, it } from 'vitest';
import { NATURES, NEUTRAL_NATURE_NAMES, natureByName, natureMultiplier } from './natures';
import type { StatKey } from './types';
import { STAT_KEYS } from './types';

describe('nature table', () => {
  it('has exactly 25 unique natures', () => {
    expect(NATURES.length).toBe(25);
    expect(new Set(NATURES.map((n) => n.name)).size).toBe(25);
  });

  it('has the five neutral natures', () => {
    expect([...NEUTRAL_NATURE_NAMES].sort()).toEqual(['Bashful', 'Docile', 'Hardy', 'Quirky', 'Serious']);
  });

  it('never boosts and lowers the same stat or touches HP', () => {
    for (const n of NATURES) {
      if (n.plus || n.minus) {
        expect(n.plus).not.toBeNull();
        expect(n.minus).not.toBeNull();
        expect(n.plus).not.toBe(n.minus);
        expect(n.plus).not.toBe('hp');
        expect(n.minus).not.toBe('hp');
      }
    }
  });

  it('every battle stat is boosted by 4 and lowered by 4 natures', () => {
    for (const stat of STAT_KEYS) {
      if (stat === 'hp') continue;
      expect(NATURES.filter((n) => n.plus === stat).length).toBe(4);
      expect(NATURES.filter((n) => n.minus === stat).length).toBe(4);
    }
  });

  it('multipliers: 1.1 / 0.9 / 1, and HP is never modified', () => {
    const adamant = natureByName('Adamant');
    expect(natureMultiplier(adamant, 'atk')).toBeCloseTo(1.1);
    expect(natureMultiplier(adamant, 'spa')).toBeCloseTo(0.9);
    expect(natureMultiplier(adamant, 'def')).toBe(1);
    expect(natureMultiplier(adamant, 'hp')).toBe(1);

    const quirky = natureByName('Quirky');
    for (const s of STAT_KEYS) expect(natureMultiplier(quirky, s)).toBe(1);
  });

  it('rejects unknown natures', () => {
    expect(() => natureByName('Moderate')).toThrow();
  });

  it('spot-checks the 20 effective natures against the canonical table', () => {
    const expected: Record<string, [StatKey, StatKey]> = {
      Lonely: ['atk', 'def'],
      Brave: ['atk', 'spe'],
      Naughty: ['atk', 'spd'],
      Bold: ['def', 'atk'],
      Relaxed: ['def', 'spe'],
      Impish: ['def', 'spa'],
      Lax: ['def', 'spd'],
      Modest: ['spa', 'atk'],
      Mild: ['spa', 'def'],
      Quiet: ['spa', 'spe'],
      Rash: ['spa', 'spd'],
      Calm: ['spd', 'atk'],
      Gentle: ['spd', 'def'],
      Sassy: ['spd', 'spe'],
      Careful: ['spd', 'spa'],
      Timid: ['spe', 'atk'],
      Hasty: ['spe', 'def'],
      Jolly: ['spe', 'spa'],
      Naive: ['spe', 'spd'],
    };
    for (const [name, [plus, minus]] of Object.entries(expected)) {
      const n = natureByName(name);
      expect(n.plus, name).toBe(plus);
      expect(n.minus, name).toBe(minus);
    }
  });
});
