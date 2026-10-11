export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export const STAT_KEYS: readonly StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
};

export const STAT_SHORT: Record<StatKey, string> = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  spa: 'SPA',
  spd: 'SPD',
  spe: 'SPE',
};

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/** One species record as baked into public/data/pokedex.json. */
export interface Species {
  id: number;
  name: string;
  display: string;
  gen: number;
  types: string[];
  base: BaseStats;
}

export interface PokedexFile {
  meta: {
    source: string;
    snapshot: string;
    count: number;
    license: string;
    generatedBy: string;
  };
  species: Species[];
}

export const MAX_IV = 31;
export const MAX_EV_PER_STAT = 252;
export const MAX_EV_TOTAL = 510;
export const MAX_LEVEL = 100;

export function totalBase(base: BaseStats): number {
  return base.hp + base.atk + base.def + base.spa + base.spd + base.spe;
}

export function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function formatDexId(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}
