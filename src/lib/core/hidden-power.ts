import type { BaseStats } from './types';

/**
 * Hidden Power calculation (Generation 3–7; the move does not exist from
 * Gen 8 onward).
 *
 * Type depends on the *parity* (lowest bit) of each IV, with weights
 * HP=1, Attack=2, Defense=4, Speed=8, Sp. Atk=16, Sp. Def=32:
 *
 *   type  = floor((a + 2b + 4c + 8d + 16e + 32f) × 15 / 63)
 *
 * Base power (Gen 3–5 only; fixed at 60 from Gen 6) depends on the *second*
 * lowest bit of each IV with the same weights:
 *
 *   power = floor((u + 2v + 4w + 8x + 16y + 32z) × 40 / 63) + 30
 *
 * Normal can never result; Fairy is impossible even in Gen 6–7.
 */
export const HP_TYPES: readonly string[] = [
  'Fighting',
  'Flying',
  'Poison',
  'Ground',
  'Rock',
  'Bug',
  'Ghost',
  'Steel',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Psychic',
  'Ice',
  'Dragon',
  'Dark',
] as const;

/** Stat order used for the bit weights: HP, Atk, Def, Spe, SpA, SpD. */
const WEIGHT_ORDER = ['hp', 'atk', 'def', 'spe', 'spa', 'spd'] as const;

function weightedBits(ivs: BaseStats, bit: 0 | 1): number {
  let sum = 0;
  let weight = 1;
  for (const key of WEIGHT_ORDER) {
    const iv = ivs[key];
    if (!Number.isInteger(iv) || iv < 0 || iv > 31) throw new Error(`IV ${key}=${iv} out of range 0–31`);
    sum += ((iv >> bit) & 1) * weight;
    weight *= 2;
  }
  return sum;
}

export function hiddenPowerTypeIndex(ivs: BaseStats): number {
  return Math.floor((weightedBits(ivs, 0) * 15) / 63);
}

export function hiddenPowerType(ivs: BaseStats): string {
  return HP_TYPES[hiddenPowerTypeIndex(ivs)];
}

/** Gen 3–5 base power (30–70). From Gen 6 the power is always 60. */
export function hiddenPowerPower(ivs: BaseStats): number {
  return Math.floor((weightedBits(ivs, 1) * 40) / 63) + 30;
}

export interface HiddenPowerSpread {
  ivs: BaseStats;
  /** Number of IVs that are 30 instead of 31. */
  evens: number;
}

/**
 * Best IV spreads for a target Hidden Power type: every spread keeps all
 * second bits set (so Gen 3–5 power is the maximum, 70) and uses only 31s and
 * a minimal number of 30s, matching the spreads breeders actually aim for.
 * All minimal-loss spreads are returned.
 */
export function bestSpreadsForType(typeIndex: number): HiddenPowerSpread[] {
  let bestEvens = 7;
  const winners: number[] = [];
  for (let pattern = 0; pattern < 64; pattern++) {
    if (Math.floor((pattern * 15) / 63) !== typeIndex) continue;
    const evens = 6 - popcount(pattern);
    if (evens < bestEvens) {
      bestEvens = evens;
      winners.length = 0;
    }
    if (evens === bestEvens) winners.push(pattern);
  }
  return winners.map((pattern) => {
    const ivs = {} as BaseStats;
    // pattern bit i ↔ WEIGHT_ORDER[i]: bit 1 → IV 31 (odd), bit 0 → IV 30.
    // IV 30 keeps bit 1 set, which is what pins power 70.
    ivs.hp = pattern & 1 ? 31 : 30;
    ivs.atk = (pattern >> 1) & 1 ? 31 : 30;
    ivs.def = (pattern >> 2) & 1 ? 31 : 30;
    ivs.spe = (pattern >> 3) & 1 ? 31 : 30;
    ivs.spa = (pattern >> 4) & 1 ? 31 : 30;
    ivs.spd = (pattern >> 5) & 1 ? 31 : 30;
    return { ivs, evens: bestEvens };
  });
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}
