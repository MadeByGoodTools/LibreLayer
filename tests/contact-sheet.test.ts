import assert from 'node:assert/strict';
import test from 'node:test';
import { planContactSheet } from '../lib/contact-sheet.ts';

void test('contact-sheet layout contains every aspect-fit image', () => {
  const plan = planContactSheet(
    [
      { width: 400, height: 200, label: 'Wide' },
      { width: 100, height: 300, label: 'Tall' },
      { width: 200, height: 200, label: 'Square' },
    ],
    { columns: 2, cellWidth: 240, cellHeight: 180, gap: 16 },
  );
  assert.equal(plan.rows, 2);
  assert.equal(plan.cells.length, 3);
  for (const cell of plan.cells) {
    assert.ok(cell.imageX >= cell.x && cell.imageY >= cell.y);
    assert.ok(cell.imageX + cell.imageWidth <= cell.x + cell.width);
    assert.ok(cell.imageY + cell.imageHeight <= cell.y + cell.height);
  }
});
