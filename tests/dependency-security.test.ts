import assert from "node:assert/strict";
import test from "node:test";

import { imageSize } from "image-size";

const MALFORMED_CONTAINER_TIMEOUT_MS = 1_000;

void test(
  "the pinned image parser rejects a zero-length ICNS entry without hanging",
  { timeout: MALFORMED_CONTAINER_TIMEOUT_MS },
  () => {
    const payload = new Uint8Array([
      0x69, 0x63, 0x6e, 0x73, 0x00, 0x00, 0x00, 0x10, 0x69, 0x63, 0x30, 0x37,
      0x00, 0x00, 0x00, 0x00,
    ]);

    assert.throws(() => imageSize(payload), /Invalid ICNS/);
  },
);

void test(
  "the pinned image parser rejects a zero-size JPEG XL box without hanging",
  { timeout: MALFORMED_CONTAINER_TIMEOUT_MS },
  () => {
    const payload = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x4a, 0x58, 0x4c, 0x20,
    ]);

    assert.throws(() => imageSize(payload), TypeError);
  },
);

void test(
  "the pinned image parser rejects a zero-size HEIF box without hanging",
  { timeout: MALFORMED_CONTAINER_TIMEOUT_MS },
  () => {
    const payload = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
    ]);

    assert.throws(() => imageSize(payload), TypeError);
  },
);

void test("the pinned image parser remains compatible with valid image metadata", () => {
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x02, 0x80, 0x00, 0x00, 0x01, 0xe0,
  ]);

  assert.deepEqual(imageSize(pngHeader), {
    height: 480,
    type: "png",
    width: 640,
  });
});
