import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adjustHighDepth,
  compositeHighDepth,
  createDefaultHighDepthAdjustments,
  levelCurveValue,
  pointCurveValue,
  precisionToEncodedRgba,
  precisionToDisplayRgba,
  toneCurveValue,
} from '../lib/high-depth.ts';
import { readSupportedPsdHeader } from '../lib/psd-header.ts';

function psdHeader(bitDepth: number, colorMode = 3) {
  const bytes = new ArrayBuffer(26),
    view = new DataView(bytes);
  view.setUint32(0, 0x38425053);
  view.setUint16(4, 1);
  view.setUint16(12, 3);
  view.setUint32(14, 2);
  view.setUint32(18, 3);
  view.setUint16(22, bitDepth);
  view.setUint16(24, colorMode);
  return bytes;
}

void test('PSD header validation accepts supported high-depth RGB sources', () => {
  assert.equal(readSupportedPsdHeader(psdHeader(16)).bitDepth, 16);
  assert.equal(readSupportedPsdHeader(psdHeader(32)).bitDepth, 32);
  assert.throws(() => readSupportedPsdHeader(psdHeader(16, 4)), /RGB/);
});

void test('16-bit conversion retains values between adjacent 8-bit steps', () => {
  const a = new Uint16Array([10000, 20000, 30000, 65535]);
  const b = new Uint16Array([10001, 20001, 30001, 65535]);
  const compositeA = compositeHighDepth(1, 1, [
    { width: 1, height: 1, data: a },
  ]);
  const compositeB = compositeHighDepth(1, 1, [
    { width: 1, height: 1, data: b },
  ]);
  assert.notEqual(compositeA[0], compositeB[0]);
  assert.equal(
    precisionToDisplayRgba({ width: 1, height: 1, data: a })[3],
    255,
  );
});

void test('float compositing preserves HDR values before display tone mapping', () => {
  const output = compositeHighDepth(1, 1, [
    {
      width: 1,
      height: 1,
      data: new Float32Array([2.5, 0.5, 0.25, 1]),
    },
  ]);
  assert.equal(output[0], 2.5);
  const display = precisionToDisplayRgba({ width: 1, height: 1, data: output });
  assert.equal(display[3], 255);
  assert.ok(display[0] > display[1]);
});

void test('high-depth masks, opacity and multiply blend combine predictably', () => {
  const output = compositeHighDepth(1, 1, [
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.8, 0.6, 0.4, 1]),
    },
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.5, 0.5, 0.5, 1]),
      opacity: 0.5,
      mask: new Uint16Array([32768]),
      blend: 'multiply',
    },
  ]);
  assert.ok(output[0] < 0.8 && output[0] > 0.6);
  assert.equal(output[3], 1);
});

void test('neutral combined adjustment preserves every 16-bit step', () => {
  const source = new Uint16Array([10000, 20000, 30000, 65535]);
  const adjacent = new Uint16Array([10001, 20001, 30001, 65535]);
  const adjusted = adjustHighDepth({ width: 1, height: 1, data: source }, {});
  const adjustedAdjacent = adjustHighDepth(
    { width: 1, height: 1, data: adjacent },
    {},
  );
  assert.ok(Math.abs(adjusted[0] - source[0] / 65535) < 1e-7);
  assert.notEqual(adjusted[0], adjustedAdjacent[0]);
  assert.notEqual(adjusted[1], adjustedAdjacent[1]);
  assert.notEqual(adjusted[2], adjustedAdjacent[2]);
  assert.equal(adjusted[3], 1);
});

void test('combined exposure, contrast and color controls are deterministic', () => {
  const adjusted = adjustHighDepth(
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.2, 0.4, 0.7, 0.5]),
    },
    { exposure: 1, contrast: 20, saturation: 30, vibrance: 25 },
  );
  assert.ok(adjusted[2] > adjusted[1]);
  assert.ok(adjusted[1] > adjusted[0]);
  assert.equal(adjusted[3], 0.5);
});

void test('all color corrections quantize only at the display boundary', () => {
  const source = new Uint8ClampedArray([64, 128, 192, 200]);
  const adjusted = adjustHighDepth(
    { width: 1, height: 1, data: source },
    { exposure: 0.5, hue: 12, vibrance: 15, photoFilterDensity: 10 },
  );
  assert.ok(adjusted instanceof Float32Array);
  const display = precisionToEncodedRgba({
    width: 1,
    height: 1,
    data: adjusted,
  });
  assert.equal(display.length, 4);
  assert.equal(display[3], 200);
});

void test('invalid high-depth adjustment buffers are rejected', () => {
  assert.throws(
    () => adjustHighDepth({ width: 2, height: 2, data: new Uint8Array(4) }, {}),
    /length/,
  );
});

void test('editable black-and-white channel mixes remain high precision', () => {
  const adjusted = adjustHighDepth(
    {
      width: 1,
      height: 1,
      data: new Uint16Array([12000, 30000, 50000, 40000]),
    },
    { blackWhite: true, redMix: 20, greenMix: 65, blueMix: 15 },
  );
  assert.equal(adjusted[0], adjusted[1]);
  assert.equal(adjusted[1], adjusted[2]);
  assert.ok(adjusted[0] > 0 && adjusted[0] < 1);
  assert.ok(Math.abs(adjusted[3] - 40000 / 65535) < 1e-7);
});

void test('tone curve stays neutral at zero and pins black and white', () => {
  assert.equal(toneCurveValue(0.25), 0.25);
  assert.equal(toneCurveValue(0.75), 0.75);
  assert.equal(toneCurveValue(0, 100, -100), 0);
  assert.equal(toneCurveValue(1, 100, -100), 1);
});

void test('tone curve zones independently lift and lower their handles', () => {
  assert.ok(toneCurveValue(0.25, 50, 0) > 0.25);
  assert.ok(toneCurveValue(0.75, 0, -50) < 0.75);
});

void test('per-channel curves change only their targeted color channel', () => {
  const adjusted = adjustHighDepth(
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.25, 0.25, 0.25, 1]),
    },
    { redCurveShadows: 50 },
  );
  assert.ok(adjusted[0] > 0.25);
  assert.equal(adjusted[1], 0.25);
  assert.equal(adjusted[2], 0.25);
});

void test('multi-point curves interpolate and target one color channel', () => {
  const points = [{ x: 0.5, y: 0.75 }];
  const samples = Array.from({ length: 101 }, (_, index) =>
    pointCurveValue(index / 100, points),
  );
  assert.ok(samples[25] > 0.25 && samples[25] < 0.75);
  assert.ok(
    samples.every((value, index) => index === 0 || value >= samples[index - 1]),
  );
  const adjusted = adjustHighDepth(
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.5, 0.5, 0.5, 1]),
    },
    { curves: { blue: [{ x: 0.5, y: 0.8 }] } },
  );
  assert.equal(adjusted[0], 0.5);
  assert.equal(adjusted[1], 0.5);
  assert.ok(adjusted[2] > 0.79);
});

void test('input and output levels remain bounded and work per channel', () => {
  assert.equal(levelCurveValue(0, { outputBlack: 32 }), 32 / 255);
  assert.equal(levelCurveValue(1, { outputWhite: 224 }), 224 / 255);
  const adjusted = adjustHighDepth(
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.5, 0.5, 0.5, 1]),
    },
    {
      outputBlack: 16,
      outputWhite: 240,
      channelLevels: {
        red: {
          black: 0,
          gamma: 1,
          white: 255,
          outputBlack: 0,
          outputWhite: 128,
        },
      },
    },
  );
  assert.ok(adjusted[0] < adjusted[1]);
  assert.equal(adjusted[1], adjusted[2]);
});

void test('Channel Mixer can remap output channels without changing alpha', () => {
  const adjusted = adjustHighDepth(
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.2, 0.6, 0.9, 0.4]),
    },
    {
      channelMixer: {
        red: { red: 0, green: 0, blue: 100, constant: 0 },
        green: { red: 0, green: 100, blue: 0, constant: 0 },
        blue: { red: 100, green: 0, blue: 0, constant: 0 },
      },
    },
  );
  assert.ok(Math.abs(adjusted[0] - 0.9) < 1e-6);
  assert.ok(Math.abs(adjusted[1] - 0.6) < 1e-6);
  assert.ok(Math.abs(adjusted[2] - 0.2) < 1e-6);
  assert.ok(Math.abs(adjusted[3] - 0.4) < 1e-6);
});

void test('Gradient Map blends luminance between editable endpoint colors', () => {
  const adjusted = adjustHighDepth(
    {
      width: 1,
      height: 1,
      data: new Float32Array([0.5, 0.5, 0.5, 1]),
    },
    {
      gradientMap: {
        shadows: '#ff0000',
        highlights: '#0000ff',
        amount: 100,
      },
    },
  );
  assert.ok(Math.abs(adjusted[0] - 0.5) < 1e-6);
  assert.equal(adjusted[1], 0);
  assert.ok(Math.abs(adjusted[2] - 0.5) < 1e-6);
});

void test('new adjustment defaults are a neutral full recipe', () => {
  const defaults = createDefaultHighDepthAdjustments();
  const source = new Float32Array([0.2, 0.4, 0.7, 0.5]);
  const adjusted = adjustHighDepth(
    { width: 1, height: 1, data: source },
    defaults,
  );
  assert.deepEqual(Array.from(adjusted), Array.from(source));
  assert.equal(defaults.photoFilterDensity, 0);
  assert.equal(defaults.exposureGamma, 1);
});
