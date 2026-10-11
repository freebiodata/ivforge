import { describe, expect, it } from 'vitest';
import dexFile from '../../data/pokedex.json';
import { searchDex } from './dex';

const dex = dexFile.species;

describe('baked Pokédex snapshot', () => {
  it('carries source attribution and a snapshot date', () => {
    expect(dexFile.meta.source).toContain('pokeapi.co');
    expect(dexFile.meta.snapshot).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dexFile.meta.count).toBe(dex.length);
  });

  it('contains the full national dex: contiguous ids 1..1025', () => {
    expect(dex.length).toBeGreaterThanOrEqual(1000);
    for (let i = 0; i < dex.length; i++) {
      expect(dex[i].id, `index ${i}`).toBe(i + 1);
    }
    expect(dex[dex.length - 1].display).toBe('Pecharunt');
  });

  it('every record has six sane base stats and 1–2 valid types', () => {
    const validTypes = new Set([
      'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
      'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
    ]);
    for (const s of dex) {
      for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const) {
        const v = s.base[k];
        expect(Number.isInteger(v) && v >= 1 && v <= 255, `#${s.id} ${s.name} ${k}=${v}`).toBe(true);
      }
      expect(s.types.length, `#${s.id}`).toBeGreaterThanOrEqual(1);
      expect(s.types.length, `#${s.id}`).toBeLessThanOrEqual(2);
      for (const t of s.types) expect(validTypes.has(t), `#${s.id} type ${t}`).toBe(true);
      expect(s.display.length, `#${s.id}`).toBeGreaterThan(0);
      expect(s.gen, `#${s.id}`).toBeGreaterThanOrEqual(1);
      expect(s.gen, `#${s.id}`).toBeLessThanOrEqual(9);
    }
  });

  it('spot-checks known species', () => {
    const garchomp = dex.find((s) => s.id === 445);
    expect(garchomp?.display).toBe('Garchomp');
    expect(garchomp?.base).toEqual({ hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 });
    expect(garchomp?.types).toEqual(['dragon', 'ground']);

    expect(dex.find((s) => s.id === 292)?.base.hp).toBe(1); // Shedinja
    expect(dex.find((s) => s.id === 1003)?.display).toBe('Ting-Lu');
    expect(dex.find((s) => s.id === 669)?.display).toBe('Flabébé');
    expect(dex.find((s) => s.id === 29)?.display).toBe('Nidoran ♀');
    expect(dex.find((s) => s.id === 445)?.gen).toBe(4);
    expect(dex.find((s) => s.id === 906)?.gen).toBe(9);
  });
});

describe('dex search', () => {
  it('finds by prefix, substring, and dex number', () => {
    expect(searchDex(dex, 'garchomp', 3)[0]?.display).toBe('Garchomp');
    expect(searchDex(dex, '445', 3)[0]?.display).toBe('Garchomp');
    expect(searchDex(dex, '#25', 3)[0]?.display).toBe('Pikachu');
    expect(searchDex(dex, 'nidoran', 5).map((s) => s.display)).toContain('Nidoran ♀');
  });

  it('is case-insensitive and trims', () => {
    expect(searchDex(dex, '  PIKACHU ', 1)[0]?.display).toBe('Pikachu');
  });

  it('returns a slice of the dex for empty queries', () => {
    expect(searchDex(dex, '', 10).length).toBe(10);
  });
});
