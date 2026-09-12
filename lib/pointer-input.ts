export type PointerInputSample = {
  pointerType: string;
  button: number;
  buttons: number;
  isPrimary: boolean;
};

export type PenIntent = 'draw' | 'erase' | 'sample' | 'ignore';

export const penIntent = (sample: PointerInputSample): PenIntent => {
  if (sample.pointerType === 'touch' && !sample.isPrimary) return 'ignore';
  if (sample.pointerType !== 'pen') return 'draw';
  if (sample.button === 5 || (sample.buttons & 32) !== 0) return 'erase';
  if (sample.button === 2 || (sample.buttons & 2) !== 0) return 'sample';
  return 'draw';
};

