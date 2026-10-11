import type { Species } from './types';

export interface GenRange {
  gen: number;
  region: string;
  min: number;
  max: number;
}

export const GEN_RANGES: readonly GenRange[] = [
  { gen: 1, region: 'Kanto', min: 1, max: 151 },
  { gen: 2, region: 'Johto', min: 152, max: 251 },
  { gen: 3, region: 'Hoenn', min: 252, max: 386 },
  { gen: 4, region: 'Sinnoh', min: 387, max: 493 },
  { gen: 5, region: 'Unova', min: 494, max: 649 },
  { gen: 6, region: 'Kalos', min: 650, max: 721 },
  { gen: 7, region: 'Alola', min: 722, max: 809 },
  { gen: 8, region: 'Galar', min: 810, max: 905 },
  { gen: 9, region: 'Paldea', min: 906, max: 1025 },
];

/**
 * Search a Pokédex list. Matches name prefix first, then substring, then
 * National Dex number. Returns at most `limit` results.
 */
export function searchDex(list: readonly Species[], query: string, limit = 60): Species[] {
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, limit);
  const numeric = q.replace(/^#/, '');
  const byId = /^\d+$/.test(numeric) ? list.find((s) => s.id === Number(numeric)) : undefined;
  const starts: Species[] = [];
  const contains: Species[] = [];
  for (const s of list) {
    const name = s.name.toLowerCase();
    const disp = s.display.toLowerCase();
    if (name.startsWith(q) || disp.startsWith(q)) starts.push(s);
    else if (name.includes(q) || disp.includes(q)) contains.push(s);
    if (starts.length >= limit) break;
  }
  const merged = byId ? [byId, ...starts.filter((s) => s !== byId), ...contains] : [...starts, ...contains];
  return merged.slice(0, limit);
}
