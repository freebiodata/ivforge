/**
 * IV Judge phrase tables.
 *
 * From Gen 7 onward the judge labels every IV individually. In Gen 3–6 the
 * judge (an NPC) comments on the highest stat only, plus an overall
 * "total potential" based on the IV sum.
 */

export interface JudgeTier {
  label: string;
  min: number;
  max: number;
}

/** Gen 7+ (Sun/Moon, USUM, Sword/Shield, BDSP, Scarlet/Violet). */
export const JUDGE_MODERN: readonly JudgeTier[] = [
  { label: 'No Good', min: 0, max: 0 },
  { label: 'Decent', min: 1, max: 15 },
  { label: 'Pretty Good', min: 16, max: 25 },
  { label: 'Very Good', min: 26, max: 29 },
  { label: 'Fantastic', min: 30, max: 30 },
  { label: 'Best', min: 31, max: 31 },
];

/** Let's Go, Pikachu/Eevee renamed a few tiers; same ranges. */
export const JUDGE_LETS_GO: readonly JudgeTier[] = [
  { label: 'Not So Good', min: 0, max: 0 },
  { label: 'OK', min: 1, max: 15 },
  { label: 'Good', min: 16, max: 25 },
  { label: 'Very Good', min: 26, max: 29 },
  { label: 'Fantastic', min: 30, max: 30 },
  { label: 'Best', min: 31, max: 31 },
];

/** Gen 6 (X/Y, Omega Ruby/Alpha Sapphire) - highest-stat comment. */
export const JUDGE_GEN6: readonly JudgeTier[] = [
  { label: "It's rather decent, I'd say", min: 0, max: 15 },
  { label: "It's very good!", min: 16, max: 25 },
  { label: "It's fantastic!", min: 26, max: 30 },
  { label: "It can't be better!", min: 31, max: 31 },
];

/** Gen 4–5 (Diamond/Pearl → Black 2/White 2). */
export const JUDGE_GEN45: readonly JudgeTier[] = [
  { label: "It's rather decent, I'd say", min: 0, max: 15 },
  { label: "It's very good!", min: 16, max: 25 },
  { label: "It's fantastic!", min: 26, max: 30 },
  { label: "It can't be better!", min: 31, max: 31 },
];

/** Gen 3 (Emerald's Battle Frontier judge). */
export const JUDGE_GEN3: readonly JudgeTier[] = [
  { label: 'That stat is relatively good', min: 0, max: 15 },
  { label: 'That stat is quite impressive', min: 16, max: 25 },
  { label: 'That stat is outstanding', min: 26, max: 30 },
  { label: "It's flawless!", min: 31, max: 31 },
];

/** Total-potential comment (Gen 3–6 judges, based on the IV sum of all six stats). */
export const JUDGE_TOTAL_POTENTIAL: readonly JudgeTier[] = [
  { label: 'Decent (0–90 total)', min: 0, max: 90 },
  { label: 'Above-average (91–120 total)', min: 91, max: 120 },
  { label: 'Relatively superior (121–150 total)', min: 121, max: 150 },
  { label: 'Outstanding (151–186 total)', min: 151, max: 186 },
];

export interface JudgeMode {
  id: 'modern' | 'letsgo' | 'gen6' | 'gen45' | 'gen3';
  label: string;
  games: string;
  tiers: readonly JudgeTier[];
  /** Judge comments on every stat, not just the highest. */
  allStats: boolean;
  hasTotalPotential: boolean;
}

export const JUDGE_MODES: readonly JudgeMode[] = [
  {
    id: 'modern',
    label: 'Gen 7+',
    games: 'Sun/Moon · USUM · Sword/Shield · BDSP · Scarlet/Violet',
    tiers: JUDGE_MODERN,
    allStats: true,
    hasTotalPotential: false,
  },
  {
    id: 'letsgo',
    label: "Let's Go",
    games: "Let's Go, Pikachu! / Let's Go, Eevee! (2018)",
    tiers: JUDGE_LETS_GO,
    allStats: true,
    hasTotalPotential: false,
  },
  {
    id: 'gen6',
    label: 'Gen 6',
    games: 'X · Y · Omega Ruby · Alpha Sapphire',
    tiers: JUDGE_GEN6,
    allStats: false,
    hasTotalPotential: true,
  },
  {
    id: 'gen45',
    label: 'Gen 4–5',
    games: 'Diamond · Pearl · Platinum · Black/White · B2/W2',
    tiers: JUDGE_GEN45,
    allStats: false,
    hasTotalPotential: true,
  },
  {
    id: 'gen3',
    label: 'Gen 3',
    games: 'Ruby · Sapphire · FireRed/LeafGreen · Emerald',
    tiers: JUDGE_GEN3,
    allStats: false,
    hasTotalPotential: true,
  },
];

export function judgeModeById(id: string): JudgeMode {
  const m = JUDGE_MODES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown judge mode "${id}"`);
  return m;
}

export function rangeLabel(tier: JudgeTier): string {
  return tier.min === tier.max ? `${tier.min}` : `${tier.min}–${tier.max}`;
}
