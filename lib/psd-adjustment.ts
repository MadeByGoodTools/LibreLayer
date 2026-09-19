import type { AdjustmentLayer, BrightnessAdjustment } from 'ag-psd';
import {
  createDefaultHighDepthAdjustments,
  type HighDepthAdjustments,
} from './high-depth.ts';

export function psdBrightnessToHighDepth(
  adjustment: BrightnessAdjustment,
): HighDepthAdjustments {
  return {
    ...createDefaultHighDepthAdjustments(),
    brightness: adjustment.brightness ?? 0,
    contrast: adjustment.contrast ?? 0,
  };
}

export function highDepthToPsdBrightness(
  input: HighDepthAdjustments | undefined,
): BrightnessAdjustment | undefined {
  const defaults = createDefaultHighDepthAdjustments();
  const resolved = { ...defaults, ...input };
  const withoutTone = { ...resolved, brightness: 0, contrast: 0 };
  if (JSON.stringify(withoutTone) !== JSON.stringify(defaults))
    return undefined;
  return {
    type: 'brightness/contrast',
    brightness: resolved.brightness ?? 0,
    contrast: resolved.contrast ?? 0,
    useLegacy: false,
  };
}

export function supportedPsdAdjustment(
  adjustment: AdjustmentLayer | undefined,
): adjustment is BrightnessAdjustment {
  return adjustment?.type === 'brightness/contrast';
}
