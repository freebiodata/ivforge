import type { StatKey } from './types';
import { STAT_KEYS } from './types';
import type { Nature } from './natures';
import { calcStat } from './stats';

export const FULL_IV_RANGE: readonly number[] = Array.from({ length: 32 }, (_, i) => i);

/** Candidate IV values per stat; `null` means "no information" (field blank). */
export type IVSets = Partial<Record<StatKey, number[] | null>>;

export interface SolveStatInput {
  base: number;
  level: number;
  ev: number;
  nature: Nature;
  stat: StatKey;
  /** The stat number shown in-game. */
  observed: number;
}

/**
 * Solve one stat's IVs by brute force: run every IV 0–31 through the exact
 * game formula and keep the values that reproduce the observed stat.
 * Because of flooring, low levels (and ±natures) can make several IVs produce
 * the same stat - that ambiguity is exactly what this returns.
 */
export function solveIVRange({ base, level, ev, nature, stat, observed }: SolveStatInput): number[] {
  const out: number[] = [];
  for (let iv = 0; iv <= 31; iv++) {
    if (calcStat({ base, iv, ev, level, nature, stat }) === observed) out.push(iv);
  }
  return out;
}

/** Intersect solved candidates with an IV Judge tier range. */
export function intersectRange(candidates: number[], min: number, max: number): number[] {
  return candidates.filter((v) => v >= min && v <= max);
}

export interface CharacteristicConstraint {
  stat: StatKey;
  /** IV of the characteristic stat ≡ mod5 (mod 5). */
  mod5: number;
}

export interface RefinedSets {
  sets: IVSets;
  /** Number of full IV spreads consistent with everything entered. */
  combos: number | null;
  /** True when every constrained stat is pinned to exactly one IV. */
  exact: boolean;
  /** False when the characteristic contradicts the stats/judge entered. */
  consistent: boolean;
  conflict?: StatKey;
}

/**
 * Apply a Characteristic as a hard constraint.
 *
 * The characteristic phrase always belongs to a stat that is *tied for the
 * highest* IV, and its exact wording pins that IV modulo 5. The game picks
 * which tied stat to report using the (hidden) encryption constant, rotating
 * through stat order HP → Atk → Def → Spe → Sp. Atk → Sp. Def - so any tied
 * stat can be the reported one. Sound constraints, given the report:
 *
 *   1. IV_reportedStat ≡ mod5 (mod 5)
 *   2. IV_reportedStat ≥ IV_t for every other stat t
 */
export function applyCharacteristic(setsIn: IVSets, char: CharacteristicConstraint): RefinedSets {
  const get = (s: StatKey): number[] => setsIn[s] ?? [...FULL_IV_RANGE];

  const raw = get(char.stat).filter((v) => v % 5 === char.mod5);
  let conflictStat: StatKey | undefined;
  const named = raw.filter((v) =>
    STAT_KEYS.every((t) => {
      if (t === char.stat) return true;
      if (get(t).some((u) => u <= v)) return true;
      conflictStat = t;
      return false;
    }),
  );

  if (named.length === 0) {
    // `conflictStat` names another stat that outranks the characteristic stat;
    // when unset, the mod-5 filter itself removed every candidate.
    return { sets: setsIn, combos: 0, exact: false, consistent: false, conflict: conflictStat ?? char.stat };
  }

  const sets: IVSets = { ...setsIn };
  sets[char.stat] = named;
  for (const t of STAT_KEYS) {
    if (t === char.stat) continue;
    const refined = get(t).filter((u) => named.some((v) => u <= v));
    if (refined.length === 0) {
      return { sets: setsIn, combos: 0, exact: false, consistent: false, conflict: t };
    }
    sets[t] = refined.length === FULL_IV_RANGE.length ? null : refined;
  }

  // Count consistent spreads: choose the named stat's IV v, every other stat
  // picks any candidate ≤ v.
  let combos = 0;
  for (const v of named) {
    let product = 1;
    for (const t of STAT_KEYS) {
      if (t === char.stat) continue;
      const set = sets[t] ?? [...FULL_IV_RANGE];
      product *= set.filter((u) => u <= v).length;
    }
    combos += product;
  }

  return { sets, combos, exact: isExact(sets), consistent: true };
}

/** Product of candidate counts over the stats actually constrained. */
export function combosWithoutCharacteristic(sets: IVSets): number | null {
  let total: number | null = null;
  for (const t of STAT_KEYS) {
    const s = sets[t];
    if (s) total = (total ?? 1) * s.length;
  }
  return total;
}

export function isExact(sets: IVSets): boolean {
  return STAT_KEYS.every((t) => sets[t]?.length === 1);
}

export function setDescription(set: number[] | null | undefined): string {
  if (!set) return '-';
  if (set.length === 0) return 'no match';
  if (set.length === 1) return String(set[0]);
  return `${set[0]}–${set[set.length - 1]}`;
}
