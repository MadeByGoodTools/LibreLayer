import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkDimensions,
  checkFileSize,
  MAX_DOCUMENT_PIXELS,
  MAX_FILE_BYTES,
  MAX_SIDE,
} from '../lib/document-limits.ts';

void test('large-document limits accept their exact supported boundaries', () => {
  assert.doesNotThrow(() => checkDimensions(MAX_SIDE, 1));
  assert.doesNotThrow(() => checkDimensions(8000, 8000));
  assert.doesNotThrow(() => checkFileSize(MAX_FILE_BYTES));
});

void test('large-document limits reject unsafe dimensions and files', () => {
  assert.throws(() => checkDimensions(MAX_SIDE + 1, 1));
  assert.throws(() => checkDimensions(MAX_DOCUMENT_PIXELS, 2));
  assert.throws(() => checkFileSize(MAX_FILE_BYTES + 1));
});
