import { createHash } from 'node:crypto';
import {
  applyColorGradeToPixels,
  createDefaultColorGrade,
} from './channel-grade.ts';
import { applyCpuReferenceFilter } from './gpu-filter-reference.ts';
import { applyRenderFilter } from './render-filter.ts';

export type VisualFixture = {
  version: 1;
  width: number;
  height: number;
  seed: number;
  cases: Array<{ name: string; expectedSha256: string }>;
};

export const visualFixturePixels = (
  width: number,
  height: number,
  seed: number,
) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      pixels[index] = (x * 17 + y * 3 + seed * 11) & 255;
      pixels[index + 1] = (x * 5 + y * 19 + seed * 7) & 255;
      pixels[index + 2] = (x * x + y * 13 + seed * 23) & 255;
      pixels[index + 3] = 128 + ((x * 7 + y * 5 + seed) & 127);
    }
  return pixels;
};

export const renderVisualFixtureCase = (
  name: string,
  source: Uint8ClampedArray,
  width: number,
  height: number,
) => {
  if (name === 'reference-invert')
    return applyCpuReferenceFilter(source, 'invert', 0.73);
  if (name === 'warm-channel-grade') {
    const grade = createDefaultColorGrade();
    grade.temperature = 28;
    grade.tint = -9;
    grade.vibrance = 34;
    grade.shadows.blue = 18;
    grade.highlights.red = 13;
    return applyColorGradeToPixels(new Uint8ClampedArray(source), grade);
  }
  if (name === 'oil-paint')
    return applyRenderFilter(source, width, height, 'oil-paint', 62, 41);
  if (name === 'seeded-clouds')
    return applyRenderFilter(source, width, height, 'clouds', 47, 23);
  throw new Error(`Unknown visual fixture case: ${name}`);
};

export const visualPixelHash = (pixels: Uint8ClampedArray) =>
  createHash('sha256').update(pixels).digest('hex');

export const runVisualRegression = (fixture: VisualFixture) => {
  if (fixture.version !== 1 || fixture.width < 1 || fixture.height < 1)
    throw new Error('Invalid visual fixture pack.');
  const source = visualFixturePixels(
    fixture.width,
    fixture.height,
    fixture.seed,
  );
  return fixture.cases.map((item) => {
    const actualSha256 = visualPixelHash(
      renderVisualFixtureCase(item.name, source, fixture.width, fixture.height),
    );
    return {
      ...item,
      actualSha256,
      passed: actualSha256 === item.expectedSha256,
    };
  });
};
