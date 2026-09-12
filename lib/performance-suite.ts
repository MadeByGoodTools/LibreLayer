export type PerformanceFixture = {
  name: string;
  width: number;
  height: number;
};

export type PerformanceResult = PerformanceFixture & {
  megapixels: number;
  tiles: number;
  elapsedMs: number;
  checksum: number;
};

export const performanceFixtures: PerformanceFixture[] = [
  { name: '12 MP document', width: 4000, height: 3000 },
  { name: '36 MP document', width: 6000, height: 6000 },
  { name: '64 MP document limit', width: 8000, height: 8000 },
  { name: '100 MP tiled workload', width: 12500, height: 8000 },
];

export function tiledFixturePlan(
  width: number,
  height: number,
  tileSize = 512,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    !Number.isInteger(tileSize) ||
    width < 1 ||
    height < 1 ||
    tileSize < 32 ||
    tileSize > 2048
  )
    throw new Error('Performance fixture dimensions are invalid.');
  const tiles = [];
  for (let y = 0; y < height; y += tileSize)
    for (let x = 0; x < width; x += tileSize)
      tiles.push({
        x,
        y,
        width: Math.min(tileSize, width - x),
        height: Math.min(tileSize, height - y),
      });
  return tiles;
}

export function runTiledPerformanceFixture(
  fixture: PerformanceFixture,
  now: () => number = () => performance.now(),
): PerformanceResult {
  const plan = tiledFixturePlan(fixture.width, fixture.height),
    tile = new Uint32Array(512 * 512);
  let checksum = 0,
    sequence = 1;
  const started = now();
  for (const region of plan) {
    const pixels = region.width * region.height;
    for (let index = 0; index < pixels; index++) {
      const value = (index + sequence * 2654435761) >>> 0;
      tile[index] = value;
      checksum = (checksum + (value & 255)) >>> 0;
    }
    sequence++;
  }
  return {
    ...fixture,
    megapixels: (fixture.width * fixture.height) / 1_000_000,
    tiles: plan.length,
    elapsedMs: Math.max(0, now() - started),
    checksum,
  };
}

export function runLayerStackPerformanceFixture(
  layerCount = 300,
  tilePixels = 128 * 128,
  now: () => number = () => performance.now(),
) {
  if (!Number.isInteger(layerCount) || layerCount < 1 || layerCount > 1000)
    throw new Error('Layer fixture count must be between 1 and 1,000.');
  const composite = new Uint8Array(tilePixels),
    started = now();
  let checksum = 0;
  for (let layer = 0; layer < layerCount; layer++) {
    const alpha = 32 + (layer % 192);
    for (let pixel = 0; pixel < composite.length; pixel++) {
      composite[pixel] =
        composite[pixel] + Math.round(((layer + pixel) % 256 - composite[pixel]) * (alpha / 255));
    }
  }
  for (const value of composite) checksum = (checksum + value) >>> 0;
  return {
    layers: layerCount,
    tilePixels,
    elapsedMs: Math.max(0, now() - started),
    checksum,
  };
}
