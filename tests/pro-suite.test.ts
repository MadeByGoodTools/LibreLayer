import assert from 'node:assert/strict';
import test from 'node:test';

class TestImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace = 'srgb' as const;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

globalThis.ImageData = TestImageData as unknown as typeof ImageData;

void test('all Professional Studio commands pass their registry and pixel checks', async () => {
  const { runSuiteSelfTest, suiteFeatures } =
    await import('../lib/pro-suite.ts');
  const result = runSuiteSelfTest();
  assert.equal(suiteFeatures.length, 119);
  assert.deepEqual(result.failures, []);
  assert.equal(result.passed, result.total);
});

void test('every Professional Studio command exposes a truthful capability level', async () => {
  const { suiteFeatures } = await import('../lib/pro-suite.ts');
  assert.equal(
    suiteFeatures.every((feature) =>
      ['Functional', 'Basic', 'Experimental'].includes(feature.level),
    ),
    true,
  );
});
