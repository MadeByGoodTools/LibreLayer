import {
  performanceFixtures,
  runLayerStackPerformanceFixture,
  runTiledPerformanceFixture,
} from '../lib/performance-suite.ts';

const results = performanceFixtures.map((fixture) =>
    runTiledPerformanceFixture(fixture),
  ),
  layers = runLayerStackPerformanceFixture(),
  totalMs = results.reduce((sum, result) => sum + result.elapsedMs, 0) + layers.elapsedMs,
  report = { generatedAt: new Date().toISOString(), results, layers, totalMs };

console.log(JSON.stringify(report, null, 2));
if (totalMs > 15000)
  throw new Error(`Performance suite took ${Math.round(totalMs)} ms; budget is 15,000 ms.`);
