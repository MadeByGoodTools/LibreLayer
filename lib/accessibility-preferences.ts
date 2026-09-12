export type MotionPreference = 'system' | 'reduced' | 'full';

export const normalizeMotionPreference = (
  value: unknown,
): MotionPreference =>
  value === 'reduced' || value === 'full' || value === 'system'
    ? value
    : 'system';

export const motionClassName = (value: unknown) =>
  `motion-${normalizeMotionPreference(value)}`;
