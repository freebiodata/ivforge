import { describe, expect, it } from 'vitest';
import { CHARACTERISTICS, GEN45_HP_CHARACTERISTICS, characteristicByText } from './characteristics';
import { STAT_KEYS } from './types';

describe('characteristics table', () => {
  it('has 30 phrases covering every stat and every mod-5 value', () => {
    expect(CHARACTERISTICS.length).toBe(30);
    for (const stat of STAT_KEYS) {
      const mods = CHARACTERISTICS.filter((c) => c.stat === stat).map((c) => c.mod5).sort();
      expect(mods, stat).toEqual([0, 1, 2, 3, 4]);
    }
  });

  it('all phrases are unique and non-empty', () => {
    const texts = CHARACTERISTICS.map((c) => c.text);
    expect(new Set(texts).size).toBe(30);
    expect(texts.every((t) => t.length > 0)).toBe(true);
  });

  it('looks up by text case-insensitively', () => {
    expect(characteristicByText('likes to run')).toMatchObject({ stat: 'spe', mod5: 0 });
    expect(characteristicByText('Mischievous')).toMatchObject({ stat: 'spa', mod5: 1 });
    expect(characteristicByText('nonsense')).toBeUndefined();
  });

  it('documents the Gen 4–5 mistranslated HP phrases', () => {
    expect(Object.keys(GEN45_HP_CHARACTERISTICS).length).toBe(3);
  });
});
