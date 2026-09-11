import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compositeHighDepth,
  precisionToDisplayRgba,
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
  assert.equal(precisionToDisplayRgba({ width: 1, height: 1, data: a })[3], 255);
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
