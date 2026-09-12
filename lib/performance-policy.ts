export type PerformanceMode = 'performance' | 'balanced' | 'quality';
export type MemoryPressure = 'normal' | 'elevated' | 'critical';

export type PerformancePolicy = {
  mode: PerformanceMode;
  pressure: MemoryPressure;
  previewPixelBudget: number;
  finalDelayMs: number;
  workerLimit: number;
  cacheBudgetMb: number;
};

export const normalizePerformanceMode = (value: unknown): PerformanceMode =>
  value === 'performance' || value === 'quality' ? value : 'balanced';

export const adaptivePerformancePolicy = ({
  mode: modeValue,
  documentPixels,
  layerCount,
  deviceMemoryGb,
  hardwareConcurrency,
}: {
  mode?: unknown;
  documentPixels: number;
  layerCount: number;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
}): PerformancePolicy => {
  const mode = normalizePerformanceMode(modeValue),
    memoryGb = Math.max(1, Math.min(32, deviceMemoryGb || 4)),
    cores = Math.max(1, Math.min(16, Math.floor(hardwareConcurrency || 4))),
    pixels = Math.max(1, Math.floor(documentPixels || 1)),
    layers = Math.max(1, Math.floor(layerCount || 1)),
    estimatedWorkingMb =
      (pixels * 4 * Math.max(2, Math.min(12, layers + 1))) / 1048576,
    availableWorkingMb = memoryGb * 1024 * 0.22,
    ratio = estimatedWorkingMb / availableWorkingMb,
    pressure: MemoryPressure =
      ratio >= 0.9 ? 'critical' : ratio >= 0.55 ? 'elevated' : 'normal',
    basePreview =
      mode === 'performance' ? 900_000 : mode === 'quality' ? 4_000_000 : 2_000_000,
    pressureScale = pressure === 'critical' ? 0.45 : pressure === 'elevated' ? 0.7 : 1,
    baseDelay = mode === 'performance' ? 260 : mode === 'quality' ? 100 : 160,
    pressureDelay = pressure === 'critical' ? 260 : pressure === 'elevated' ? 100 : 0,
    cacheScale = mode === 'performance' ? 0.45 : mode === 'quality' ? 0.9 : 0.65;
  return {
    mode,
    pressure,
    previewPixelBudget: Math.max(262_144, Math.round(basePreview * pressureScale)),
    finalDelayMs: baseDelay + pressureDelay,
    workerLimit: Math.max(
      1,
      Math.min(8, Math.floor(cores * (pressure === 'critical' ? 0.25 : 0.5))),
    ),
    cacheBudgetMb: Math.max(32, Math.round(memoryGb * 256 * cacheScale)),
  };
};

export const previewScaleForPixels = (pixels: number, budget: number) =>
  pixels <= budget
    ? 1
    : Math.max(0.125, Math.min(1, Math.sqrt(budget / Math.max(1, pixels))));
