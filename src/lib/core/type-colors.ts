/** Standard-ish type colors for badges. All use white text. */
export const TYPE_COLORS: Record<string, string> = {
  normal: '#9099a1',
  fire: '#ff9d55',
  water: '#5090d6',
  electric: '#f4d23c',
  grass: '#63bc5a',
  ice: '#73cec0',
  fighting: '#ce4069',
  poison: '#ab6ac8',
  ground: '#d97845',
  flying: '#8fa9de',
  psychic: '#fa7179',
  bug: '#90c12c',
  rock: '#c7b78b',
  ghost: '#5269ac',
  dragon: '#0b6dc3',
  dark: '#5a5465',
  steel: '#5a8ea1',
  fairy: '#ec8fe6',
};

export function typeColor(t: string): string {
  return TYPE_COLORS[t] ?? '#8a8f98';
}
