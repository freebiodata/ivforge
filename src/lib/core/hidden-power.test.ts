import { describe, expect, it } from 'vitest';
import {
  HP_TYPES,
  bestSpreadsForType,
  hiddenPowerPower,
  hiddenPowerType,
  hiddenPowerTypeIndex,
} from './hidden-power';
import type { BaseStats } from './types';

const ivs = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): BaseStats => ({
  hp,
  atk,
  def,
  spa,
  spd,
  spe,
});

describe('Hidden Power (Gen 3–7)', () => {
  it('Bulbapedia worked example: 25/2/12/17/5/8 (HP/Atk/Def/Spe/SpA/SpD) → Bug, power 31', () => {
    const set = ivs(25, 2, 12, 5, 8, 17); // stored in stat order; Spe last here
    expect(hiddenPowerType(set)).toBe('Bug');
    expect(hiddenPowerPower(set)).toBe(31);
  });

  it('Bulbapedia example: HP30/Atk31/Def31/Spe31/SpA30/SpD31 → Grass 70', () => {
    const set = ivs(30, 31, 31, 30, 31, 31); // (hp, atk, def, spa, spd, spe)
    expect(hiddenPowerType(set)).toBe('Grass');
    expect(hiddenPowerPower(set)).toBe(70);
  });

  it('six perfect 31s → Dark, 70 (the famous "6IV = HP Dark 70")', () => {
    const set = ivs(31, 31, 31, 31, 31, 31);
    expect(hiddenPowerType(set)).toBe('Dark');
    expect(hiddenPowerPower(set)).toBe(70);
  });

  it('the classic Hidden Power Ice spread 31/30/30/31/31/31 → Ice', () => {
    const set = ivs(31, 30, 30, 31, 31, 31);
    expect(hiddenPowerType(set)).toBe('Ice');
  });

  it('all-zero IVs → Fighting, minimum power 30', () => {
    const set = ivs(0, 0, 0, 0, 0, 0);
    expect(hiddenPowerType(set)).toBe('Fighting');
    expect(hiddenPowerPower(set)).toBe(30);
  });

  it('all-3 IVs → Dark 70 (both bit planes fully set)', () => {
    const set = ivs(3, 3, 3, 3, 3, 3);
    expect(hiddenPowerType(set)).toBe('Dark');
    expect(hiddenPowerPower(set)).toBe(70);
  });

  it('rejects out-of-range IVs', () => {
    expect(() => hiddenPowerTypeIndex(ivs(32, 0, 0, 0, 0, 0))).toThrow();
  });

  it('every type index is reachable and Normal/Fairy are impossible', () => {
    expect(HP_TYPES).not.toContain('Normal');
    expect(HP_TYPES).not.toContain('Fairy');
    expect(HP_TYPES.length).toBe(16);
    const seen = new Set<number>();
    for (let hp = 0; hp <= 31; hp++) {
      for (let atk = 0; atk <= 31; atk += 31) {
        for (let def = 0; def <= 31; def += 31) {
          const set = ivs(hp, atk, def, 31 - hp % 2, 31, 30);
          seen.add(hiddenPowerTypeIndex(set));
        }
      }
    }
    // exhaustive sweep instead: all 64 parity patterns
    seen.clear();
    for (let p = 0; p < 64; p++) {
      const set = ivs(p & 1, (p >> 1) & 1, (p >> 2) & 1, (p >> 4) & 1, (p >> 5) & 1, (p >> 3) & 1);
      seen.add(hiddenPowerTypeIndex(set));
    }
    expect(seen.size).toBe(16);
  });
});

describe('breeding target spreads', () => {
  it('Dark keeps all six 31s', () => {
    const spreads = bestSpreadsForType(15);
    expect(spreads.length).toBe(1);
    expect(spreads[0].evens).toBe(0);
    expect(spreads[0].ivs).toEqual(ivs(31, 31, 31, 31, 31, 31));
  });

  it('every returned spread produces the target type at power 70', () => {
    for (let t = 0; t < 16; t++) {
      const spreads = bestSpreadsForType(t);
      expect(spreads.length, `type ${t}`).toBeGreaterThan(0);
      for (const s of spreads) {
        expect(hiddenPowerTypeIndex(s.ivs), `type ${t}`).toBe(t);
        expect(hiddenPowerPower(s.ivs), `type ${t}`).toBe(70);
        expect(s.ivs.hp).toBeLessThanOrEqual(31);
      }
    }
  });

  it('Ice is achievable with at most one 30 (five 31s + one 30)', () => {
    const spreads = bestSpreadsForType(13);
    expect(spreads.every((s) => s.evens === 1)).toBe(true);
    // parity pattern 111011 = 55: HP/Atk/Def/SpA/SpD odd, Speed even
    const found = spreads.some((s) => s.ivs.hp === 31 && s.ivs.spe === 30);
    expect(found).toBe(true);
  });

  it('Fighting is the hardest type to breed: best spread still needs four 30s', () => {
    const spreads = bestSpreadsForType(0);
    const best = Math.min(...spreads.map((s) => s.evens));
    expect(best).toBe(4);
    // and no type ever needs more than four 30s
    for (let t = 0; t < 16; t++) {
      const s = bestSpreadsForType(t);
      expect(Math.min(...s.map((x) => x.evens)), `type ${t}`).toBeLessThanOrEqual(4);
    }
  });
});
