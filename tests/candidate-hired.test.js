'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Seeker = require('../src/models/SeekerProfile');

const person = (id, name) => ({ user_id: id, user: { full_name: name }, area: 'Hải Châu', work_mode: 'offline',
  language_level: 2, has_experience: true, experience: 'Pha chế', strengths: 'Giao tiếp', availability: [{ slot: 'evening' }] });

// employments: { seeker_id, owner, ended_at }
function database(profiles, employments) {
  const log = [];
  return { log, from(table) {
    const preds = []; let start = 0, end = Infinity;
    const q = {
      select() { return q; }, in() { return q; }, gte() { return q; }, ilike() { return q; }, order() { return q; },
      eq(k, v) { if (table === 'employments' && k === 'positions.shops.owner_id') { log.push(['owner', v]); preds.push(r => r.owner === v); } else preds.push(r => r[k] === v); return q; },
      is(k, v) { preds.push(r => (r[k] ?? null) === v); return q; },
      range(a, b) { start = a; end = b; return q; },
      then(resolve, reject) {
        const rows = table === 'employments' ? employments : profiles;
        return Promise.resolve({ data: rows.filter(r => preds.every(p => p(r))).slice(start, end + 1), error: null }).then(resolve, reject);
      },
    };
    return q;
  } };
}

const profiles = [person('s1', 'An'), person('s2', 'Bình'), person('s3', 'Chi')];
const employments = [
  { seeker_id: 's1', owner: 'boss-A', ended_at: null },            // đang làm ở quán của A
  { seeker_id: 's2', owner: 'boss-B', ended_at: null },            // đang làm ở quán của B
  { seeker_id: 's3', owner: 'boss-A', ended_at: '2026-11-01' },    // đã nghỉ ở quán của A
];
const ids = rows => rows.map(r => r.user_id);

test('an employer does not see people who currently work at their own shops', async () => {
  const model = new Seeker(database(profiles, employments));
  assert.deepEqual(ids(await model.search({ employerId: 'boss-A' })), ['s2', 's3']);
});

test('people working for another shop still appear, and so do those whose job ended', async () => {
  const model = new Seeker(database(profiles, employments));
  assert.deepEqual(ids(await model.search({ employerId: 'boss-B' })), ['s1', 's3']);
});

test('without an employer id nothing is excluded (keeps the old behavior)', async () => {
  const db = database(profiles, employments);
  assert.deepEqual(ids(await new Seeker(db).search()), ['s1', 's2', 's3']);
  assert.equal(db.log.length, 0, 'employments is not queried');
});

test('the exclusion is applied before the result limit', async () => {
  const model = new Seeker(database(profiles, employments));
  assert.deepEqual(ids(await model.search({ employerId: 'boss-A', limit: 1 })), ['s2']);
});

test('hiredIds only asks for employments of the given owner that have not ended', async () => {
  const db = database(profiles, employments);
  const set = await new Seeker(db).hiredIds('boss-A');
  assert.deepEqual([...set], ['s1']);
  assert.deepEqual(db.log, [['owner', 'boss-A']]);
});

test('the seekers route passes the logged-in employer id and a client cannot override it', () => {
  const src = require('node:fs').readFileSync(require.resolve('../src/routes/seekerRoutes.js'), 'utf8');
  assert.match(src, /search\(\{ \.\.\.req\.query, employerId: req\.user\.id \}\)/);
});
