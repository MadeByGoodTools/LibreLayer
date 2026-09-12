/// <reference lib="webworker" />
import {
  performanceFixtures,
  runLayerStackPerformanceFixture,
  runTiledPerformanceFixture,
} from './performance-suite';

self.onmessage = () => {
  try {
    const results = performanceFixtures.map((fixture, index) => {
      const result = runTiledPerformanceFixture(fixture);
      self.postMessage({
        kind: 'progress',
        progress: Math.round(((index + 1) / (performanceFixtures.length + 1)) * 100),
      });
      return result;
    });
    const layers = runLayerStackPerformanceFixture();
    self.postMessage({ kind: 'result', results, layers });
  } catch (error) {
    self.postMessage({
      kind: 'error',
      message: error instanceof Error ? error.message : 'Performance check failed.',
    });
  }
};
