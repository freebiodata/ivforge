import type { StatKey } from './types';
import type { Nature } from './natures';
import { natureMultiplier } from './natures';

/**
 * Generation 3+ stat formula (identical in Gen 3–9):
 *
 *   HP   = floor((2·Base + IV + floor(EV/4)) · Level / 100) + Level + 10
 *   Other = floor((floor((2·Base + IV + floor(EV/4)) · Level / 100) + 5) · N)
 *
 * where N is 1.1 (nature boost), 0.9 (nature drop) or 1.
 * Floating point is safe here: stat operands stay well below 2^30 and the
 * 1.1/0.9 products of stat-range integers never straddle an integer boundary
 * at double precision for values < 1000.
 */
export function statValue(
  base: number,
  iv: number,
  ev: number,
  level: number,
  natureMod: number,
  isHP: boolean,
): number {
  const evTerm = Math.floor(ev / 4);
  const inner = Math.floor(((2 * base + iv + evTerm) * level) / 100);
  return isHP ? inner + level + 10 : Math.floor((inner + 5) * natureMod);
}

export interface CalcStatInput {
  base: number;
  iv: number;
  ev: number;
  level: number;
  nature: Nature;
  stat: StatKey;
}

/** Final in-game stat for one battle stat. */
export function calcStat({ base, iv, ev, level, nature, stat }: CalcStatInput): number {
  const mod = stat === 'hp' ? 1 : natureMultiplier(nature, stat);
  return statValue(base, iv, ev, level, mod, stat === 'hp');
}

/** The lowest/highest stat physically possible at these settings. */
export function statRange(base: number, ev: number, level: number, nature: Nature, stat: StatKey): { min: number; max: number } {
  return {
    min: calcStat({ base, iv: 0, ev, level, nature, stat }),
    max: calcStat({ base, iv: 31, ev, level, nature, stat }),
  };
}

export interface CalcSpreadInput {
  base: import('./types').BaseStats;
  ivs: import('./types').BaseStats;
  evs: import('./types').BaseStats;
  level: number;
  nature: Nature;
}

/** All six final stats. */
export function calcSpread({ base, ivs, evs, level, nature }: CalcSpreadInput): import('./types').BaseStats {
  const out = {} as import('./types').BaseStats;
  for (const k of Object.keys(base) as StatKey[]) {
    out[k] = calcStat({ base: base[k], iv: ivs[k], ev: evs[k], level, nature, stat: k });
  }
  return out;
}

/** Total EVs across the six stats (legal maximum 510). */
export function totalEV(evs: import('./types').BaseStats): number {
  return evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
}
