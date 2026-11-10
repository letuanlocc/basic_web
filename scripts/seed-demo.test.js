'use strict';

// Offline checks: no Supabase credentials, SDK, PostgreSQL, or network required.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const seed = require('./seed-demo');

function fixture() {
  const state = { applications: [], invitations: [], calls: [], next: 1, employments: 0 };
  const createClient = (actor) => ({
    from(table) {
      const filters = {};
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        then(resolve, reject) {
          return Promise.resolve({ data: state[table].filter(r => Object.entries(filters).every(([k, v]) => r[k] === v)).map(r => ({ ...r })), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      state.calls.push({ actor, name });
      if (name === 'apply_to_position') {
        assert.equal(actor, 'seeker');
        const id = state.next++;
        state.applications.push({ id, position_id: args.p_position_id, seeker_id: 's1', status: 'pending', source: 'direct' });
        return { data: id, error: null };
      }
      if (name === 'decide_application' || name === 'withdraw_application') {
        assert.equal(actor, name === 'withdraw_application' ? 'seeker' : 'owner');
        const row = state.applications.find(r => r.id === args.p_application_id);
        assert.equal(row.status, 'pending');
        row.status = name === 'withdraw_application' ? 'withdrawn' : args.p_accept ? 'accepted' : 'rejected';
        if (row.status === 'accepted') state.employments++;
        return { data: null, error: null };
      }
      if (name === 'send_invitation') {
        assert.equal(actor, 'owner');
        const id = state.next++;
        state.invitations.push({ id, position_id: args.p_position_id, seeker_id: args.p_seeker_id, status: 'pending' });
        return { data: id, error: null };
      }
      if (name === 'respond_invitation') {
        assert.equal(actor, 'seeker');
        const row = state.invitations.find(r => r.id === args.p_invitation_id);
        assert.equal(row.status, 'pending');
        row.status = args.p_accept ? 'accepted' : 'declined';
        let id = null;
        if (args.p_accept) {
          id = state.next++;
          state.applications.push({ id, position_id: row.position_id, seeker_id: row.seeker_id, status: 'pending', source: 'invite' });
        }
        return { data: id, error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  });
  return { state, seeker: { id: 's1', client: createClient('seeker') }, position: { id: 10, owner: { client: createClient('owner') } } };
}

test('scope: 2 seekers + 4 employers, 5 jobs and complete statuses', () => {
  assert.equal(seed.ACCOUNTS.filter(a => a.role === 'seeker').length, 2);
  assert.equal(seed.ACCOUNTS.filter(a => a.role === 'employer').length, 4);
  assert.equal(new Set(seed.ACCOUNTS.map(a => a.email)).size, 6);
  assert.equal(new Set(seed.ACCOUNTS.map(a => a.phone)).size, 6);
  for (const a of seed.ACCOUNTS) { assert.match(a.phone, /^0[0-9]{9}$/); assert.match(a.email, /@caranh-demo\.test$/); }
  assert.equal(seed.SHOPS.length, 4);
  assert.equal(seed.JOBS.length, 5);
  assert.deepEqual(new Set(seed.JOBS.map(j => j.work_form)), new Set(['Full-time', 'Part-time']));
  assert.deepEqual(new Set(seed.EXPECTED_APPLICATIONS.map(a => a.status)), new Set(['pending', 'accepted', 'rejected', 'withdrawn']));
  assert.deepEqual(new Set(seed.EXPECTED_INVITATIONS.map(a => a.status)), new Set(['pending', 'accepted', 'declined']));
  assert.equal(seed.EXPECTED_APPLICATIONS.filter(a => a.status === 'accepted').length, 1);
  const acceptedInvite = seed.EXPECTED_INVITATIONS.find(i => i.status === 'accepted');
  assert.ok(seed.EXPECTED_APPLICATIONS.some(a => a.seeker === acceptedInvite.seeker && a.job === acceptedInvite.job && a.source === 'invite' && a.status === 'pending'));
  assert.equal(new Set(seed.SAVED.map(s => `${s.seeker}/${s.job}`)).size, 4);
});
test('payloads obey SQL v2 salary, date, hours, content and owner constraints', () => {
  for (const job of seed.JOBS) {
    const shop = seed.SHOPS.find(s => s.owner === job.owner);
    const owner = seed.ACCOUNTS.find(a => a.key === job.owner);
    assert.equal(owner.role, 'employer');
    const body = seed.jobBody(job, shop, owner, '2026-11-10');
    assert.equal(body.mode, shop.mode);
    assert.equal(body.start_date >= body.deadline, true);
    assert.equal(body.deadline >= '2026-11-10', true);
    assert.equal((body.salary_unit === 'negotiable'), body.salary_amount === null);
    assert.ok(body.salary_amount > 0);
    assert.ok(body.open_hour >= 0 && body.close_hour <= 24 && body.open_hour < body.close_hour);
    assert.ok(body.min_week_hours >= 1 && body.min_week_hours <= body.max_week_hours);
    assert.ok(body.max_week_hours <= body.work_days.length * body.max_day_hours);
    assert.ok(body.min_per_shift >= 0 && body.min_per_shift <= body.max_per_shift);
    assert.ok(body.summary.length <= 120);
    for (const field of ['task', 'requirement', 'perk']) assert.ok(job[field].length > 0 && job[field].length <= 200);
    for (const shift of seed.shiftsFor(job)) {
      assert.ok(shift.start_hour >= body.open_hour && shift.end_hour <= body.close_hour);
      assert.ok(shift.end_hour > shift.start_hour);
      assert.ok(shift.end_hour - shift.start_hour <= body.max_day_hours);
      assert.ok(shift.end_hour - shift.start_hour <= body.max_shift_hours);
    }
  }
});
test('dates: leap year, month boundary, Sunday and Monday cross-year', () => {
  assert.equal(seed.datePlus('2028-02-28', 1), '2028-02-29');
  assert.equal(seed.datePlus('2026-11-30', 1), '2026-12-01');
  assert.deepEqual(seed.weekDates('2027-01-03'), { weekday: 6, monday: '2026-12-28', nextMonday: '2027-01-04' });
  assert.deepEqual(seed.weekDates('2027-01-04'), { weekday: 0, monday: '2027-01-04', nextMonday: '2027-01-11' });
  assert.throws(() => seed.datePlus('2026-02-30', 1));
});
test('configuration rejects another project and never needs a password for read checks', () => {
  const env = { SUPABASE_URL: 'https://uhaakvedcnodndhpvurt.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test-public', SUPABASE_SECRET_KEY: 'test-secret' };
  assert.doesNotThrow(() => seed.config(env, false));
  assert.throws(() => seed.config(env, true), /DEMO_SEED_PASSWORD/);
  assert.throws(() => seed.config({ ...env, SUPABASE_URL: 'https://different.supabase.co' }, false), /chỉ dành/);
  assert.throws(() => seed.config({ ...env, SUPABASE_URL: `${env.SUPABASE_URL}/rest/v1` }, false), /chỉ dành/);
  assert.throws(() => seed.config({ ...env, SUPABASE_URL: `${env.SUPABASE_URL}?secret=ignored` }, false), /chỉ dành/);
});
test('profile fills leave existing values intact', () => {
  assert.deepEqual(seed.missingFields({ name: 'Edited name', area: null, enabled: false, n: 0 }, { name: 'Seed', area: 'Đà Nẵng', enabled: true, n: 5 }), { area: 'Đà Nẵng' });
});
for (const status of ['accepted', 'rejected', 'withdrawn']) {
  test(`application ${status}: correct actor, resumable, repeat adds nothing`, async () => {
    const { state, seeker, position } = fixture();
    const expected = { status, source: 'direct' };
    await seed.ensureApplication(seeker, position, expected);
    const calls = state.calls.length;
    await seed.ensureApplication(seeker, position, expected);
    assert.equal(state.applications.length, 1);
    assert.equal(state.applications[0].status, status);
    assert.equal(state.employments, status === 'accepted' ? 1 : 0);
    assert.equal(state.calls.length, calls);
  });
}
test('partial failure after apply: resumes pending row without a duplicate', async () => {
  const { state, seeker, position } = fixture();
  state.applications.push({ id: 40, position_id: 10, seeker_id: 's1', status: 'pending', source: 'direct' });
  await seed.ensureApplication(seeker, position, { status: 'accepted', source: 'direct' });
  assert.equal(state.applications.length, 1);
  assert.deepEqual(state.calls, [{ actor: 'owner', name: 'decide_application' }]);
});
test('drift or multiple application records: stops with zero writes', async () => {
  const { state, seeker, position } = fixture();
  state.applications.push({ id: 1, position_id: 10, seeker_id: 's1', status: 'withdrawn', source: 'direct' });
  await assert.rejects(seed.ensureApplication(seeker, position, { status: 'accepted', source: 'direct' }), /Giữ nguyên/);
  state.applications.push({ ...state.applications[0], id: 2 });
  await assert.rejects(seed.ensureApplication(seeker, position, { status: 'withdrawn', source: 'direct' }), /nhiều bản ghi/);
  assert.equal(state.calls.length, 0);
});
for (const status of ['pending', 'accepted', 'declined']) {
  test(`invitation ${status}: repeat does not send another invitation or application`, async () => {
    const { state, seeker, position } = fixture();
    await seed.ensureInvitation(seeker, position, status);
    const calls = state.calls.length;
    await seed.ensureInvitation(seeker, position, status);
    assert.equal(state.invitations.length, 1);
    assert.equal(state.invitations[0].status, status);
    assert.equal(state.applications.length, status === 'accepted' ? 1 : 0);
    assert.equal(state.calls.length, calls);
    if (status === 'accepted') {
      await seed.ensureApplication(seeker, position, { source: 'invite', status: 'pending' });
      assert.equal(state.calls.length, calls);
    }
  });
}
test('default invocation previews without loading SDK, credentials or networking', () => {
  const result = spawnSync(process.execPath, [require.resolve('./seed-demo')], { encoding: 'utf8', env: {} });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CHẾ ĐỘ XEM TRƯỚC/);
  assert.match(result.stdout, /seeker1@caranh-demo.test/);
});
