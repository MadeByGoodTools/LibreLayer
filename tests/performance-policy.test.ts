import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptivePerformancePolicy,
  normalizePerformanceMode,
  previewScaleForPixels,
} from '../lib/performance-policy.ts';

void test('performance modes normalize and preserve explicit choices', () => {
  assert.equal(normalizePerformanceMode('performance'), 'performance');
  assert.equal(normalizePerformanceMode('quality'), 'quality');
  assert.equal(normalizePerformanceMode('unknown'), 'balanced');
});

void test('memory pressure progressively lowers preview work and concurrency', () => {
  const normal = adaptivePerformancePolicy({
      mode: 'balanced',
      documentPixels: 1_000_000,
      layerCount: 2,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
    }),
    critical = adaptivePerformancePolicy({
      mode: 'balanced',
      documentPixels: 100_000_000,
      layerCount: 20,
      deviceMemoryGb: 4,
      hardwareConcurrency: 8,
    });
  assert.equal(normal.pressure, 'normal');
  assert.equal(critical.pressure, 'critical');
  assert.ok(critical.previewPixelBudget < normal.previewPixelBudget);
  assert.ok(critical.finalDelayMs > normal.finalDelayMs);
  assert.ok(critical.workerLimit < normal.workerLimit);
});

void test('preview scale retains small documents and bounds large ones', () => {
  assert.equal(previewScaleForPixels(500_000, 1_000_000), 1);
  assert.equal(previewScaleForPixels(4_000_000, 1_000_000), 0.5);
  assert.equal(previewScaleForPixels(1_000_000_000, 1), 0.125);
});
