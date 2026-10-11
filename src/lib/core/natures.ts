import type { StatKey } from './types';
import { STAT_LABELS } from './types';

export interface Nature {
  name: string;
  /** Stat boosted by 10%, or null for a neutral nature. */
  plus: StatKey | null;
  /** Stat lowered by 10%, or null for a neutral nature. */
  minus: StatKey | null;
}

const N = (name: string, plus: StatKey | null, minus: StatKey | null): Nature => ({ name, plus, minus });

/** All 25 natures. Five are neutral (same stat raised and lowered = no effect). */
export const NATURES: readonly Nature[] = [
  N('Hardy', null, null),
  N('Lonely', 'atk', 'def'),
  N('Brave', 'atk', 'spe'),
  N('Adamant', 'atk', 'spa'),
  N('Naughty', 'atk', 'spd'),
  N('Bold', 'def', 'atk'),
  N('Docile', null, null),
  N('Relaxed', 'def', 'spe'),
  N('Impish', 'def', 'spa'),
  N('Lax', 'def', 'spd'),
  N('Modest', 'spa', 'atk'),
  N('Mild', 'spa', 'def'),
  N('Quiet', 'spa', 'spe'),
  N('Bashful', null, null),
  N('Rash', 'spa', 'spd'),
  N('Calm', 'spd', 'atk'),
  N('Gentle', 'spd', 'def'),
  N('Sassy', 'spd', 'spe'),
  N('Careful', 'spd', 'spa'),
  N('Quirky', null, null),
  N('Timid', 'spe', 'atk'),
  N('Hasty', 'spe', 'def'),
  N('Jolly', 'spe', 'spa'),
  N('Naive', 'spe', 'spd'),
  N('Serious', null, null),
];

export const NEUTRAL_NATURE_NAMES: readonly string[] = NATURES.filter((n) => !n.plus).map((n) => n.name);

export function natureByName(name: string): Nature {
  const n = NATURES.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!n) throw new Error(`Unknown nature "${name}"`);
  return n;
}

/** HP is never affected by nature. */
export function natureMultiplier(nature: Nature, stat: StatKey): number {
  if (stat === 'hp') return 1;
  if (nature.plus === stat) return 1.1;
  if (nature.minus === stat) return 0.9;
  return 1;
}

export function natureEffectLabel(nature: Nature): string {
  if (!nature.plus || !nature.minus) return 'No effect';
  return `+10% ${STAT_LABELS[nature.plus]} · −10% ${STAT_LABELS[nature.minus]}`;
}
