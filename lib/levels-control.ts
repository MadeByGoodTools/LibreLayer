export type LevelControlKey = 'levelsBlack' | 'levelsGamma' | 'levelsWhite';

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

export function levelPosition(key: LevelControlKey, value: number) {
  if (key === 'levelsGamma') {
    const gamma = clamp(value, 0.1, 3);
    return gamma <= 1
      ? ((gamma - 0.1) / 0.9) * 0.5
      : 0.5 + ((gamma - 1) / 2) * 0.5;
  }
  return clamp(value, 0, 255) / 255;
}

export function levelValueFromPosition(
  key: LevelControlKey,
  position: number,
  black: number,
  white: number,
) {
  const normalized = clamp(position, 0, 1);
  if (key === 'levelsBlack')
    return clamp(Math.round(normalized * 255), 0, Math.max(0, white - 1));
  if (key === 'levelsWhite')
    return clamp(Math.round(normalized * 255), Math.min(255, black + 1), 255);
  const gamma =
    normalized <= 0.5
      ? 0.1 + (normalized / 0.5) * 0.9
      : 1 + ((normalized - 0.5) / 0.5) * 2;
  return Math.round(gamma * 100) / 100;
}
