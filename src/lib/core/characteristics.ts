import type { StatKey } from './types';

export interface Characteristic {
  text: string;
  stat: StatKey;
  /** The reported stat's IV ≡ mod5 (mod 5). */
  mod5: number;
}

/**
 * Characteristics (Gen 3–9). The phrase belongs to a stat tied for the highest
 * IV; its wording pins that IV mod 5. Text below is the modern (Gen 8+)
 * phrasing - older games phrase the same meanings slightly differently.
 */
export const CHARACTERISTICS: readonly Characteristic[] = [
  // HP - IV mod 5 = 0..4
  { text: 'Loves to eat', stat: 'hp', mod5: 0 },
  { text: 'Takes plenty of siestas', stat: 'hp', mod5: 1 },
  { text: 'Nods off a lot', stat: 'hp', mod5: 2 },
  { text: 'Scatters things often', stat: 'hp', mod5: 3 },
  { text: 'Likes to relax', stat: 'hp', mod5: 4 },
  // Attack
  { text: 'Proud of its power', stat: 'atk', mod5: 0 },
  { text: 'Likes to thrash about', stat: 'atk', mod5: 1 },
  { text: 'A little quick tempered', stat: 'atk', mod5: 2 },
  { text: 'Likes to fight', stat: 'atk', mod5: 3 },
  { text: 'Quick tempered', stat: 'atk', mod5: 4 },
  // Defense
  { text: 'Sturdy body', stat: 'def', mod5: 0 },
  { text: 'Capable of taking hits', stat: 'def', mod5: 1 },
  { text: 'Highly persistent', stat: 'def', mod5: 2 },
  { text: 'Good endurance', stat: 'def', mod5: 3 },
  { text: 'Good perseverance', stat: 'def', mod5: 4 },
  // Speed
  { text: 'Likes to run', stat: 'spe', mod5: 0 },
  { text: 'Alert to sounds', stat: 'spe', mod5: 1 },
  { text: 'Impetuous and silly', stat: 'spe', mod5: 2 },
  { text: 'Somewhat of a clown', stat: 'spe', mod5: 3 },
  { text: 'Quick to flee', stat: 'spe', mod5: 4 },
  // Special Attack
  { text: 'Highly curious', stat: 'spa', mod5: 0 },
  { text: 'Mischievous', stat: 'spa', mod5: 1 },
  { text: 'Thoroughly cunning', stat: 'spa', mod5: 2 },
  { text: 'Often lost in thought', stat: 'spa', mod5: 3 },
  { text: 'Very finicky', stat: 'spa', mod5: 4 },
  // Special Defense
  { text: 'Strong willed', stat: 'spd', mod5: 0 },
  { text: 'Somewhat vain', stat: 'spd', mod5: 1 },
  { text: 'Strongly defiant', stat: 'spd', mod5: 2 },
  { text: 'Hates to lose', stat: 'spd', mod5: 3 },
  { text: 'Somewhat stubborn', stat: 'spd', mod5: 4 },
];

export function characteristicByText(text: string): Characteristic | undefined {
  return CHARACTERISTICS.find((c) => c.text.toLowerCase() === text.toLowerCase());
}

/**
 * In Gen 4–5 English games the HP characteristics were mistranslated and
 * appear in a swapped order. Mapping (Gen 4–5 wording → true IV mod 5):
 */
export const GEN45_HP_CHARACTERISTICS: Record<string, number> = {
  'Often dozes off': 1,
  'Often scatters things': 2,
  'Scatters things often': 3,
};

export const CHARACTERISTIC_TIEBREAK_NOTE =
  'If several IVs tie for highest, the game reports one of them - which one depends on a hidden value, so the characteristic only guarantees that its stat is tied for the highest IV.';
