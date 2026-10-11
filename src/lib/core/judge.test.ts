import { describe, expect, it } from 'vitest';
import {
  JUDGE_LETS_GO,
  JUDGE_MODERN,
  JUDGE_TOTAL_POTENTIAL,
  JUDGE_MODES,
  judgeModeById,
  rangeLabel,
} from './judge';

describe('IV judge tables', () => {
  it('Gen 7+ tiers map to the documented ranges', () => {
    const byLabel = Object.fromEntries(JUDGE_MODERN.map((t) => [t.label, t]));
    expect(byLabel['No Good']).toMatchObject({ min: 0, max: 0 });
    expect(byLabel['Decent']).toMatchObject({ min: 1, max: 15 });
    expect(byLabel['Pretty Good']).toMatchObject({ min: 16, max: 25 });
    expect(byLabel['Very Good']).toMatchObject({ min: 26, max: 29 });
    expect(byLabel['Fantastic']).toMatchObject({ min: 30, max: 30 });
    expect(byLabel['Best']).toMatchObject({ min: 31, max: 31 });
  });

  it("Let's Go renamed tiers keep the same ranges", () => {
    expect(JUDGE_LETS_GO.map((t) => [t.min, t.max])).toEqual(JUDGE_MODERN.map((t) => [t.min, t.max]));
  });

  it('Gen 3–6 per-stat tiers partition 0–31', () => {
    for (const mode of JUDGE_MODES.filter((m) => !m.allStats)) {
      let covered = 0;
      let prev = -1;
      for (const t of mode.tiers) {
        expect(t.min).toBe(prev + 1);
        expect(t.max).toBeGreaterThanOrEqual(t.min);
        covered += t.max - t.min + 1;
        prev = t.max;
      }
      expect(covered).toBe(32);
    }
  });

  it('total-potential tiers partition 0–186', () => {
    let prev = -1;
    for (const t of JUDGE_TOTAL_POTENTIAL) {
      expect(t.min).toBe(prev + 1);
      prev = t.max;
    }
    expect(prev).toBe(186);
  });

  it('mode lookup works and rejects unknown ids', () => {
    expect(judgeModeById('modern').allStats).toBe(true);
    expect(judgeModeById('gen3').hasTotalPotential).toBe(true);
    expect(() => judgeModeById('gen99')).toThrow();
  });

  it('rangeLabel formatting', () => {
    expect(rangeLabel({ label: 'x', min: 30, max: 30 })).toBe('30');
    expect(rangeLabel({ label: 'x', min: 26, max: 29 })).toBe('26–29');
  });
});
