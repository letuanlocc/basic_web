const test = require('node:test');
const assert = require('node:assert/strict');
const Application = require('../src/models/Application');

// Client giả: ghi lại thao tác update, trả dữ liệu cố định cho select.
function fakeClient({ app, active = [] }) {
  const calls = { updates: [] };
  const chain = (table) => {
    const q = { filters: {}, op: 'select', patch: null };
    const api = {
      select: () => api,
      update: (patch) => { q.op = 'update'; q.patch = patch; return api; },
      eq: (k, v) => { q.filters[k] = v; return api; },
      is: () => api,
      limit: () => api,
      maybeSingle: () => Promise.resolve({ data: app && String(q.filters.id) === String(app.id) && q.filters.seeker_id === app.seeker_id ? app : null, error: null }),
      then: (resolve) => {
        if (q.op === 'update') { calls.updates.push({ table, patch: q.patch, filters: q.filters }); return resolve({ data: null, error: null }); }
        return resolve({ data: table === 'employments' ? active : [], error: null });
      },
    };
    return api;
  };
  return { calls, from: chain };
}

const model = new Application({});

test('gỡ đơn accepted của việc đã nghỉ: chuyển sang withdrawn', async () => {
  const c = fakeClient({ app: { id: 9, seeker_id: 's1', status: 'accepted', position_id: 14 }, active: [] });
  assert.equal(await model.dismissEnded(9, 's1', c), true);
  assert.deepEqual(c.calls.updates.map((u) => [u.table, u.patch.status]), [['applications', 'withdrawn']]);
});

test('không gỡ được khi vẫn đang làm ở vị trí đó', async () => {
  const c = fakeClient({ app: { id: 9, seeker_id: 's1', status: 'accepted', position_id: 14 }, active: [{ id: 5 }] });
  await assert.rejects(model.dismissEnded(9, 's1', c), (e) => e.status === 409);
  assert.equal(c.calls.updates.length, 0);
});

test('không gỡ được đơn của người khác hoặc đơn chưa accepted', async () => {
  const c = fakeClient({ app: { id: 9, seeker_id: 's1', status: 'accepted', position_id: 14 } });
  await assert.rejects(model.dismissEnded(9, 'someone-else', c), (e) => e.status === 404);
  const p = fakeClient({ app: { id: 9, seeker_id: 's1', status: 'pending', position_id: 14 } });
  await assert.rejects(model.dismissEnded(9, 's1', p), (e) => e.status === 409);
  assert.equal(c.calls.updates.length + p.calls.updates.length, 0);
});
