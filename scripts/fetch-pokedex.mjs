#!/usr/bin/env node
/**
 * fetch-pokedex.mjs — bakes a compact Pokédex snapshot (base stats + types for
 * every base-form species, National Dex #1–#1025) from PokéAPI into:
 *
 *   src/data/pokedex.json    — imported at build time by Astro pages
 *   public/data/pokedex.json — static asset fetched by the client-side tools
 *
 * Usage:
 *   node scripts/fetch-pokedex.mjs               # fetch & write
 *   node scripts/fetch-pokedex.mjs --if-missing  # skip when a valid snapshot exists
 *   node scripts/fetch-pokedex.mjs --date=YYYY-MM-DD
 *
 * Source: https://pokeapi.co (open API, no key). Attribution is baked into the
 * file and shown in the site footer.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const SRC_OUT = fileURLToPath(new URL('../src/data/pokedex.json', import.meta.url));
const PUBLIC_OUT = fileURLToPath(new URL('../public/data/pokedex.json', import.meta.url));

const STAT_KEYS = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
};
const ALL_STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const VALID_TYPES = new Set([
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
  'steel', 'fairy',
]);
// Species whose official English names don't follow the default
// "capitalize each hyphen-separated word" rule.
const SPECIAL_NAMES = {
  'nidoran-f': 'Nidoran ♀',
  'nidoran-m': 'Nidoran ♂',
  'mr-mime': 'Mr. Mime',
  'mr-rime': 'Mr. Rime',
  'mime-jr': 'Mime Jr.',
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  'type-null': 'Type: Null',
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  'wo-chien': 'Wo-Chien',
  'chien-pao': 'Chien-Pao',
  'ting-lu': 'Ting-Lu',
  'chi-yu': 'Chi-Yu',
  flabebe: 'Flabébé',
};

const args = process.argv.slice(2);
const ifMissing = args.includes('--if-missing');
const dateArg = args.find((a) => a.startsWith('--date='));
const snapshot = dateArg ? dateArg.slice(7) : new Date().toISOString().slice(0, 10);

function genOf(id) {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
}

function displayName(name) {
  if (SPECIAL_NAMES[name]) return SPECIAL_NAMES[name];
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mapPokemon(p) {
  const stats = {};
  for (const s of p.stats) {
    const key = STAT_KEYS[s.stat?.name];
    if (!key) throw new Error(`Unknown stat "${s.stat?.name}" for #${p.id}`);
    stats[key] = s.base_stat;
  }
  for (const k of ALL_STATS) {
    if (typeof stats[k] !== 'number') throw new Error(`Missing stat "${k}" for #${p.id}`);
  }
  const types = [...p.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name);
  if (types.length < 1 || types.length > 2 || types.some((t) => !VALID_TYPES.has(t))) {
    throw new Error(`Bad types for #${p.id}: ${types.join(',')}`);
  }
  return {
    id: p.id,
    name: p.name,
    display: displayName(p.name),
    gen: genOf(p.id),
    types,
    base: { hp: stats.hp, atk: stats.atk, def: stats.def, spa: stats.spa, spd: stats.spd, spe: stats.spe },
  };
}

function validateSpecies(list) {
  if (!Array.isArray(list) || list.length < 1000) {
    throw new Error(`Expected ≥1000 species, got ${list?.length}`);
  }
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.id !== i + 1) throw new Error(`Gap in National Dex IDs at index ${i} (found #${s.id})`);
    for (const k of ALL_STATS) {
      const v = s.base[k];
      if (!Number.isInteger(v) || v < 1 || v > 255) {
        throw new Error(`Bad base stat ${k}=${v} for #${s.id} ${s.name}`);
      }
    }
    if (!s.display || !s.types?.length) throw new Error(`Incomplete record for #${s.id}`);
  }
}

function snapshotMeta(count) {
  return {
    source: 'PokéAPI — https://pokeapi.co',
    snapshot,
    count,
    license: 'Data derived from PokéAPI; attribution required. Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.',
    generatedBy: 'scripts/fetch-pokedex.mjs',
  };
}

async function fetchJson(url, opts = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: {
          'User-Agent': 'IVXray/1.0 (+https://ivforge.top; build-time Pokédex snapshot script)',
          Accept: 'application/json',
          ...(opts.headers || {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
  throw lastErr;
}

/** Primary path: one GraphQL request for the whole dex. */
async function fetchViaGraphQL() {
  const query = `query Pokedex {
    pokemon: pokemon_v2_pokemon(where: {id: {_lt: 10000}}, order_by: {id: asc}) {
      id
      name
      stats: pokemon_v2_pokemonstats { base_stat stat: pokemon_v2_stat { name } }
      types: pokemon_v2_pokemontypes { slot type: pokemon_v2_type { name } }
    }
  }`;
  const json = await fetchJson('https://beta.pokeapi.co/graphql/v1beta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: {} }),
  });
  const list = json?.data?.pokemon;
  if (!Array.isArray(list) || list.length < 1000) {
    throw new Error(`GraphQL returned ${list?.length} species`);
  }
  return list;
}

/** Fallback path: REST with bounded concurrency. */
async function fetchViaREST() {
  const index = await fetchJson('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0');
  const ids = index.results
    .map((r) => Number(r.url.split('/').filter(Boolean).pop()))
    .filter((id) => id > 0 && id < 10000)
    .sort((a, b) => a - b);
  const out = [];
  const CHUNK = 16;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const details = await Promise.all(slice.map((id) => fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`)));
    out.push(...details);
    process.stdout.write(`\r  REST ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
  }
  process.stdout.write('\n');
  out.sort((a, b) => a.id - b.id);
  return out;
}

async function writeOut(species) {
  const payload = { meta: snapshotMeta(species.length), species };
  const json = JSON.stringify(payload, null, 1) + '\n';
  for (const dest of [SRC_OUT, PUBLIC_OUT]) {
    await mkdir(new URL('.', `file:///${dest.replace(/\\/g, '/')}`).pathname.replace(/^\//, ''), { recursive: true }).catch(() => {});
    await writeFile(dest, json, 'utf8');
  }
  console.log(`✔ Wrote ${species.length} species (snapshot ${snapshot})`);
  console.log(`  - ${SRC_OUT}`);
  console.log(`  - ${PUBLIC_OUT}`);
}

async function main() {
  if (ifMissing && existsSync(SRC_OUT)) {
    try {
      const existing = JSON.parse(await readFile(SRC_OUT, 'utf8'));
      if (existing?.species?.length >= 1000 && existing?.meta?.snapshot) {
        console.log(`↷ Using existing Pokédex snapshot (${existing.species.length} species, ${existing.meta.snapshot})`);
        if (!existsSync(PUBLIC_OUT)) await writeOut(existing.species);
        return;
      }
    } catch {
      /* fall through and refetch */
    }
  }

  let raw;
  try {
    console.log('→ Fetching Pokédex from PokéAPI (GraphQL)…');
    raw = await fetchViaGraphQL();
  } catch (e) {
    console.warn(`  GraphQL failed (${e.message}); falling back to REST…`);
    raw = await fetchViaREST();
  }

  const species = raw.map(mapPokemon);
  validateSpecies(species);
  await writeOut(species);
}

main().catch((e) => {
  console.error(`✖ ${e.message}`);
  process.exit(1);
});
