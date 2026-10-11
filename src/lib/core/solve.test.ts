import { describe, expect, it } from 'vitest';
import {
  applyCharacteristic,
  combosWithoutCharacteristic,
  intersectRange,
  setDescription,
  solveIVRange,
} from './solve';
import { natureByName } from './natures';
import type { StatKey } from './types';

const serious = natureByName('Serious');
const adamant = natureByName('Adamant');

describe('IV solving', () => {
  it('Lv100, 0 EV, neutral nature pins an exact IV', () => {
    // stat = 2·base + IV + 5 → IV = observed − 5 − 200
    expect(solveIVRange({ base: 100, level: 100, ev: 0, nature: serious, stat: 'atk', observed: 236 })).toEqual([31]);
    expect(solveIVRange({ base: 100, level: 100, ev: 0, nature: serious, stat: 'atk', observed: 220 })).toEqual([15]);
    expect(solveIVRange({ base: 100, level: 100, ev: 0, nature: serious, stat: 'atk', observed: 205 })).toEqual([0]);
  });

  it('Lv100 with nature modifier still pins an exact IV (steps of 1.1 never collapse)', () => {
    expect(solveIVRange({ base: 100, level: 100, ev: 0, nature: adamant, stat: 'atk', observed: 259 })).toEqual([31]);
    expect(solveIVRange({ base: 100, level: 100, ev: 0, nature: adamant, stat: 'spa', observed: 212 })).toEqual([31]);
  });

  it('low levels produce ambiguous ranges (rounding hides IV differences)', () => {
    // Base 50 HP at Lv10: floor((100+IV)·10/100)+20 → IV 0–9 all give 30
    const res = solveIVRange({ base: 50, level: 10, ev: 0, nature: serious, stat: 'hp', observed: 30 });
    expect(res).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(setDescription(res)).toBe('0–9');
  });

  it('Lv50 classic check: base 100 EV 0 neutral, stat 120 → IV 30 or 31 (real Lv50 ambiguity)', () => {
    // floor((200+30)·0.5) = 115 and floor((200+31)·0.5) = floor(115.5) = 115 - 
    // rounding hides the last IV point for even base stats at Lv50.
    expect(solveIVRange({ base: 100, level: 50, ev: 0, nature: serious, stat: 'atk', observed: 120 })).toEqual([30, 31]);
  });

  it('impossible stat values return an empty set', () => {
    expect(solveIVRange({ base: 100, level: 100, ev: 0, nature: serious, stat: 'atk', observed: 999 })).toEqual([]);
    expect(setDescription([])).toBe('no match');
  });

  it('EVs are respected while solving', () => {
    expect(solveIVRange({ base: 100, level: 100, ev: 252, nature: serious, stat: 'atk', observed: 299 })).toEqual([31]);
    expect(solveIVRange({ base: 100, level: 100, ev: 252, nature: serious, stat: 'atk', observed: 283 })).toEqual([15]);
  });

  it('intersectRange narrows candidates by judge tiers', () => {
    expect(intersectRange([20, 21, 22, 23, 24, 25], 26, 31)).toEqual([]);
    expect(intersectRange([20, 25, 26, 30, 31], 26, 31)).toEqual([26, 30, 31]);
  });
});

describe('characteristic constraint', () => {
  it('refines the named stat to IVs ≡ mod 5 and caps every other stat at the max', () => {
    const out = applyCharacteristic({}, { stat: 'spe', mod5: 0 });
    expect(out.consistent).toBe(true);
    expect(out.sets.spe).toEqual([0, 5, 10, 15, 20, 25, 30]);
    // Speed can be at most 30 here (31 ≢ 0 mod 5), so every other stat is capped at 30
    expect(out.sets.atk).toEqual(Array.from({ length: 31 }, (_, i) => i));
    expect(out.combos).toBeGreaterThan(0);
  });

  it('counts consistent spreads exactly, including stats the user left blank', () => {
    // Atk solved to [25,26]; Speed characteristic (mod 5 = 3) pins Speed to 28.
    // Blank stats (hp/def/spa/spd) can be anything 0–28 → 29 options each.
    const out = applyCharacteristic(
      { atk: [25, 26], spe: [28, 29, 30] },
      { stat: 'spe', mod5: 3 },
    );
    expect(out.consistent).toBe(true);
    expect(out.sets.spe).toEqual([28]);
    expect(out.sets.atk).toEqual([25, 26]);
    expect(out.combos).toBe(2 * 29 ** 4);
    expect(out.exact).toBe(false);
  });

  it('allows ties for the highest IV (wrap-around tie-break)', () => {
    const out = applyCharacteristic({ atk: [30], spe: [30] }, { stat: 'atk', mod5: 0 });
    expect(out.consistent).toBe(true);
    expect(out.sets.atk).toEqual([30]);
    expect(out.sets.spe).toEqual([30]);
    // blank stats may still be 0–30 → many spreads remain possible
    expect(out.combos).toBe(31 ** 4);
  });

  it('flags contradictions instead of silently emptying sets', () => {
    // HP solved to exactly 10, but the characteristic requires HP ≡ 1 (mod 5)
    const out = applyCharacteristic({ hp: [10] }, { stat: 'hp', mod5: 1 });
    expect(out.consistent).toBe(false);
    expect(out.combos).toBe(0);
    // original sets untouched so the UI can show what conflicts
    expect(out.sets.hp).toEqual([10]);
  });

  it('a stat strictly above the characteristic stat is inconsistent', () => {
    const out = applyCharacteristic({ atk: [31], spa: [10, 11, 12] }, { stat: 'spa', mod5: 1 });
    // spa named set = {11} (11 % 5 = 1); v = 11 possible only if atk has a candidate ≤ 11 - it doesn't
    expect(out.consistent).toBe(false);
    expect(out.conflict).toBe('atk');
  });

  it('combosWithoutCharacteristic multiplies constrained stats only', () => {
    expect(combosWithoutCharacteristic({})).toBeNull();
    expect(combosWithoutCharacteristic({ hp: [31], atk: [1, 2, 3] })).toBe(3);
  });
});
