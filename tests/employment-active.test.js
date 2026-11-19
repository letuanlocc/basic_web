'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Employment = require('../src/models/Employment');

function database(rows) {
  return { from(table) {
    assert.equal(table, 'employments');
    const preds = [];
    const q = {
      select() { return q; },
      eq(k, v) { preds.push(r => String(r[k]) === String(v)); return q; },
      is(k, v) { preds.push(r => (r[k] ?? null) === v); return q; },
      maybeSingle() { return q; },
      then(resolve, reject) { return Promise.resolve({ data: rows.filter(r => preds.every(p => p(r)))[0] ?? null, error: null }).then(resolve, reject); },
    };
    return q;
  } };
}
const rows = [
  { id: 1, seeker_id: 'me', ended_at: null },
  { id: 2, seeker_id: 'me', ended_at: '2026-11-19T03:00:00Z' },
  { id: 3, seeker_id: 'someone-else', ended_at: null },
];

test('an active employment of the caller passes', async () => {
  await new Employment(database(rows)).assertActive(1, 'me');
});

test('an employment the employer already ended is rejected with 403', async () => {
  await assert.rejects(new Employment(database(rows)).assertActive(2, 'me'), e => e.status === 403 && /không còn làm/.test(e.message));
});

test("someone else's employment, or one that does not exist, is rejected", async () => {
  const model = new Employment(database(rows));
  await assert.rejects(model.assertActive(3, 'me'), e => e.status === 403);
  await assert.rejects(model.assertActive(999, 'me'), e => e.status === 403);
});
