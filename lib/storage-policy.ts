export type SaveLocationState =
  | 'downloads'
  | 'connected'
  | 'permission-needed'
  | 'unavailable';

export const normalizeVersionRetention = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(2, Math.min(50, Math.round(numeric)))
    : 12;
};

export const saveLocationStatus = (
  name: string,
  state: SaveLocationState,
) => {
  if (state === 'downloads') return 'Downloads · browser fallback ready';
  if (state === 'connected') return `${name} · connected and writable`;
  if (state === 'permission-needed')
    return `${name} · reconnect or re-authorize before saving`;
  return `${name} · unavailable; Downloads fallback ready`;
};
