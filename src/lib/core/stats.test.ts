import { describe, expect, it } from 'vitest';
import { calcStat, calcSpread, statRange, statValue, totalEV } from './stats';
import { natureByName } from './natures';
import type { BaseStats } from './types';

const neutral = natureByName('Serious');
const adamant = natureByName('Adamant');
const bold = natureByName('Bold');

describe('Gen 3–9 stat formula', () => {
  it('base 100, IV 31, 0 EV, neutral: Lv100 → HP 341 / stat 236; Lv50 → HP 175 / stat 120', () => {
    expect(statValue(100, 31, 0, 100, 1, true)).toBe(341);
    expect(statValue(100, 31, 0, 100, 1, false)).toBe(236);
    expect(statValue(100, 31, 0, 50, 1, true)).toBe(175);
    expect(statValue(100, 31, 0, 50, 1, false)).toBe(120);
  });

  it('nature modifiers at Lv100 base 100 IV 31: +10% → 259, −10% → 212', () => {
    expect(statValue(100, 31, 0, 100, 1.1, false)).toBe(259);
    expect(statValue(100, 31, 0, 100, 0.9, false)).toBe(212);
  });

  it('max investment: base 100, IV 31, EV 252 at Lv100 → 299 neutral / 328 boosted', () => {
    expect(statValue(100, 31, 252, 100, 1, false)).toBe(299);
    expect(statValue(100, 31, 252, 100, 1.1, false)).toBe(328);
    // HP ignores nature even with EVs
    expect(statValue(100, 31, 252, 100, 1.1, true)).toBe(404);
  });

  it('level 1 Bulbasaur HP: 12 with IV 31, 11 with IV 0', () => {
    expect(statValue(45, 31, 0, 1, 1, true)).toBe(12);
    expect(statValue(45, 0, 0, 1, 1, true)).toBe(11);
  });

  it('Garchomp attack at Lv50 (base 130, IV 31, 0 EV): 150 neutral, 165 Adamant', () => {
    expect(calcStat({ base: 130, iv: 31, ev: 0, level: 50, nature: neutral, stat: 'atk' })).toBe(150);
    expect(calcStat({ base: 130, iv: 31, ev: 0, level: 50, nature: adamant, stat: 'atk' })).toBe(165);
  });

  it('Garchomp Lv100, all 31 IVs, EVs 252/252/0/0/0/4 (HP/Atk/Spe), Adamant', () => {
    const garchomp: BaseStats = { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 };
    const max31: BaseStats = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const evs: BaseStats = { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 };
    const result = calcSpread({ base: garchomp, ivs: max31, evs, level: 100, nature: adamant });
    // HP 2·108+31+63 = 310 → +110; Atk 354+5 = 359 → ×1.1 = 394.9 → 394
    expect(result).toEqual({ hp: 420, atk: 394, def: 226, spa: 176, spd: 206, spe: 241 });
  });

  it('Garchomp max Jolly Speed at Lv100 (EV 252) is 333', () => {
    const jolly = natureByName('Jolly');
    expect(calcStat({ base: 102, iv: 31, ev: 252, level: 100, nature: jolly, stat: 'spe' })).toBe(333);
  });

  it('Bold lowers Attack: base 100 IV 31 Lv100 259 neutral → 236×… check exact', () => {
    expect(calcStat({ base: 100, iv: 31, ev: 0, level: 100, nature: bold, stat: 'atk' })).toBe(212);
    expect(calcStat({ base: 100, iv: 31, ev: 0, level: 100, nature: bold, stat: 'def' })).toBe(259);
  });

  it('statRange spans IV 0–31', () => {
    expect(statRange(100, 0, 100, neutral, 'atk')).toEqual({ min: 205, max: 236 });
    expect(statRange(100, 0, 100, neutral, 'hp')).toEqual({ min: 310, max: 341 });
  });

  it('totalEV sums six stats', () => {
    const evs: BaseStats = { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 2 };
    expect(totalEV(evs)).toBe(510);
  });
});
