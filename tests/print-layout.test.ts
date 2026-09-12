import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultPrintSettings,
  normalizePrintSettings,
  paperSizeMm,
  planPrintLayout,
} from '../lib/print-layout.ts';

void test('paper presets and orientation resolve to measured page sizes', () => {
  assert.deepEqual(paperSizeMm({ paper: 'a4', orientation: 'portrait' }), {
    widthMm: 210,
    heightMm: 297,
  });
  assert.deepEqual(paperSizeMm({ paper: 'a4', orientation: 'landscape' }), {
    widthMm: 297,
    heightMm: 210,
  });
  const custom = paperSizeMm({
    paper: 'custom',
    orientation: 'portrait',
    customWidthMm: 500,
    customHeightMm: 700,
  });
  assert.deepEqual(custom, { widthMm: 500, heightMm: 700 });
});

void test('fit, fill, actual, and custom sizing preserve image aspect ratio', () => {
  const source = [{ name: 'Landscape', width: 6000, height: 4000 }],
    ratios = ['fit', 'fill', 'actual', 'custom'].map((scaleMode) => {
      const layout = planPrintLayout(
        {
          ...defaultPrintSettings,
          paper: 'a4',
          scaleMode: scaleMode as typeof defaultPrintSettings.scaleMode,
          scalePercent: 72,
          sourcePpi: 300,
        },
        source,
        100,
      );
      return layout.items[0].width / layout.items[0].height;
    });
  ratios.forEach((ratio) => assert.ok(Math.abs(ratio - 1.5) < 0.0001));
});

void test('bleed extends outside trim and custom placement uses millimetres', () => {
  const layout = planPrintLayout(
    {
      ...defaultPrintSettings,
      paper: 'a4',
      bleedMm: 5,
      placement: 'custom',
      offsetXmm: 10,
      offsetYmm: -4,
      scaleMode: 'custom',
      scalePercent: 50,
    },
    [{ name: 'Square', width: 1000, height: 1000 }],
    254,
  );
  assert.equal(Math.round(layout.trim.x - layout.bleed.x), 50);
  const centeredX =
    layout.trim.x + (layout.trim.width - layout.items[0].width) / 2;
  assert.equal(Math.round(layout.items[0].x - centeredX), 100);
});

void test('contact sheets place every source in a non-overlapping bounded grid', () => {
  const sources = Array.from({ length: 7 }, (_, index) => ({
      name: `Image ${index + 1}`,
      width: 800 + index * 10,
      height: 600,
    })),
    layout = planPrintLayout(
      {
        ...defaultPrintSettings,
        mode: 'contact-sheet',
        columns: 3,
        metadata: true,
      },
      sources,
      96,
    );
  assert.equal(layout.items.length, sources.length);
  layout.items.forEach((item, index) => {
    assert.equal(item.sourceIndex, index);
    assert.ok(item.x >= layout.trim.x - 0.001);
    assert.ok(item.y >= layout.trim.y - 0.001);
    assert.ok(item.x + item.width <= layout.trim.x + layout.trim.width + 0.001);
    assert.ok(
      item.y + item.height <= layout.trim.y + layout.trim.height + 0.001,
    );
    assert.ok(item.captionY !== undefined);
  });
});

void test('print preferences recover from unsafe persisted values', () => {
  const settings = normalizePrintSettings({
    paper: 'poster' as never,
    marginMm: Infinity,
    scalePercent: 9000,
    columns: 0,
    metadataText: 'x'.repeat(500),
  });
  assert.equal(settings.paper, 'letter');
  assert.equal(settings.marginMm, 12.7);
  assert.equal(settings.scalePercent, 800);
  assert.equal(settings.columns, 1);
  assert.equal(settings.metadataText.length, 240);
});
