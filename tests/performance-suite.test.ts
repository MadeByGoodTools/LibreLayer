import assert from 'node:assert/strict';
import test from 'node:test';
import {
  performanceFixtures,
  runLayerStackPerformanceFixture,
  runTiledPerformanceFixture,
  tiledFixturePlan,
} from '../lib/performance-suite.ts';

void test('large fixture tiling covers every pixel exactly once', () => {
  for (const fixture of performanceFixtures) {
    const pixels = tiledFixturePlan(fixture.width, fixture.height).reduce(
      (sum, tile) => sum + tile.width * tile.height,
      0,
    );
    assert.equal(pixels, fixture.width * fixture.height);
  }
});

void test('tiled workloads execute deterministic 12 through 100 MP passes', () => {
  for (const fixture of performanceFixtures) {
    const first = runTiledPerformanceFixture(fixture, () => 1),
      second = runTiledPerformanceFixture(fixture, () => 1);
    assert.equal(first.checksum, second.checksum);
    assert.equal(first.megapixels, (fixture.width * fixture.height) / 1_000_000);
  }
});

void test('hundreds-of-layers fixture composites a real pixel tile', () => {
  const result = runLayerStackPerformanceFixture(300, 64 * 64, () => 1);
  assert.equal(result.layers, 300);
  assert.equal(result.tilePixels, 4096);
  assert.ok(result.checksum > 0);
});
