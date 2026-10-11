import type { Species } from '../core/types';

let cache: Promise<Species[]> | null = null;

/** Fetch the baked Pokédex snapshot once; every tool shares the promise. */
export function loadDex(): Promise<Species[]> {
  if (!cache) {
    cache = fetch('/data/pokedex.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { species: Species[] }) => d.species);
  }
  return cache;
}
