'use strict';

const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { after, before, beforeEach, mock, test } = require('node:test');

const EMPLOYEE = '00000000-0000-4000-8000-000000000001';
const MANAGER = '00000000-0000-4000-8000-000000000002';
const EMPLOYMENT_ID = 71;
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const { monday, today } = require('../src/utils/positionRules');

let origin, server, state;
let weekStart, days;
const address = (employment, scheduleWeek) => employment + ':' + scheduleWeek;
const cell = (shiftId, weekday = 0) => ({ shift_id: shiftId, weekday });

function table(name) {
  if (name === 'google_connections') return [...state.connections.values()];
  if (name === 'employments') return [state.employment];
  if (name === 'calendar_events') return [...state.mappings.values()];
  assert.equal(name, 'shift_assignments');
  return [...state.schedule.entries()].flatMap(([key, cells]) => {
    const [employmentId, savedWeek] = key.split(':');
    return cells.map((row) => ({
      ...row, employment_id: Number(employmentId), week_start: savedWeek,
      shift: state.shifts.get(row.shift_id),
    }));
  });
}

// Thay lớp dữ liệu Supabase, vẫn chạy route Express, middleware, OAuth state và bộ đồng bộ thật.
function query(name) {
  let rows = table(name);
  let single = false;
  let mutation;
  const builder = {
    select() { return builder; },
    eq(key, value) {
      rows = rows.filter((row) => String(key === 'employments.seeker_id' ? state.employment.seeker_id : row[key]) === String(value));
      return builder;
    },
    is(key, value) { rows = rows.filter((row) => row[key] === value); return builder; },
    gte(key, value) { rows = rows.filter((row) => row[key] >= value); return builder; },
    or() { return builder; },
    order(key) { rows.sort((a, b) => String(a[key]).localeCompare(String(b[key]))); return builder; },
    limit(size) { rows = rows.slice(0, size); return builder; },
    maybeSingle() { single = true; return builder; },
    upsert(value) {
      mutation = () => {
        if (name === 'google_connections') {
          const previous = state.connections.get(value.user_id);
          state.connections.set(value.user_id, { auto_sync_manager_changes: true, ...previous, ...value });
        } else {
          assert.equal(name, 'calendar_events');
          const key = [value.employment_id, value.shift_id, value.week_start, value.weekday].join(':');
          state.mappings.set(key, { ...state.mappings.get(key), ...value });
        }
      };
      return builder;
    },
    update(value) { mutation = () => rows.forEach((row) => Object.assign(row, value)); return builder; },
    delete() {
      assert.equal(name, 'google_connections');
      mutation = () => rows.forEach((row) => state.connections.delete(row.user_id));
      return builder;
    },
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        if (mutation) mutation();
        return { data: structuredClone(single ? rows[0] ?? null : rows), error: null };
      }).then(resolve, reject);
    },
  };
  return builder;
}

function googleError(status, error) {
  return Object.assign(new Error('Google API stub'), { response: { status, data: { error } } });
}

function calendarStub() {
  const events = state.events;
  const run = (name, write) => async (params) => {
    if (params) assert.equal(params.calendarId, 'primary');
    state.googleCalls.push(name);
    if (state.googleGate) await state.googleGate;
    if (state.googleFailure) throw state.googleFailure;
    return write(params);
  };
  return { verifyAccess: run('verifyAccess', () => ({})), events: {
    list: run('list', ({ privateExtendedProperty: [marker] }) => {
      const items = [...events.values()].filter((event) =>
        marker === 'caranhScheduleCell=' + event.extendedProperties.private.caranhScheduleCell);
      return { data: { items } };
    }),
    insert: run('insert', ({ requestBody }) => {
      if (events.has(requestBody.id)) throw googleError(409);
      events.set(requestBody.id, structuredClone(requestBody));
      return { data: { id: requestBody.id } };
    }),
    patch: run('patch', ({ eventId, requestBody }) => {
      if (!events.has(eventId)) throw googleError(404);
      events.set(eventId, { ...structuredClone(requestBody), id: eventId });
      return { data: { id: eventId } };
    }),
    delete: run('delete', ({ eventId }) => {
      if (!events.delete(eventId)) throw googleError(410);
    }),
  } };
}

before(async () => {
  server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = 'http://127.0.0.1:' + server.address().port;
  Object.assign(process.env, {
    SUPABASE_URL: 'https://caranh-fixture.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable',
    SUPABASE_SECRET_KEY: 'test-secret',
    GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'calendar-test-secret',
    GOOGLE_REDIRECT_URI: origin + '/api/google/callback',
  });

  const { admin, anon } = require('../src/config/supabase');
  mock.method(admin, 'from', query);
  mock.method(anon.auth, 'getClaims', async (token) => ({
    data: ['seeker', 'employer'].includes(token) ? { claims: {
      sub: token === 'seeker' ? EMPLOYEE : MANAGER,
      role: 'authenticated', user_metadata: { role: token },
    } } : null,
  }));
  mock.method(anon.auth, 'getUser', async () => ({ data: {}, error: {} }));

  const Employment = require('../src/models/Employment');
  function save(employmentId, scheduleWeek, cells) {
    assert.equal(Number(employmentId), EMPLOYMENT_ID);
    state.schedule.set(address(EMPLOYMENT_ID, scheduleWeek), structuredClone(cells));
    return { total_hours: 7, below_min_week: false };
  }
  mock.method(Employment.prototype, 'saveSchedule', async (...args) => save(...args));
  mock.method(Employment.prototype, 'manageSchedule', async (...args) => save(...args));
  mock.method(Employment.prototype, 'remove', async (id) => {
    assert.equal(Number(id), EMPLOYMENT_ID);
    state.employment.ended_at = new Date().toISOString();
    state.schedule.clear();
    return true;
  });

  const Google = require('../src/services/googleCalendar');
  mock.method(Google, 'calendarClient', calendarStub);
  const { google } = require('googleapis');
  mock.method(google.auth.OAuth2.prototype, 'getToken', async ({ code, codeVerifier }) => {
    state.tokenExchanges++;
    assert.equal(code, 'stub-code');
    assert.equal(typeof codeVerifier, 'string');
    assert.ok(codeVerifier.length >= 43);
    return { tokens: { refresh_token: 'test-refresh-token', scope: CALENDAR_SCOPE } };
  });
  server.on('request', require('../src/app'));
});

after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  mock.restoreAll();
});

beforeEach(() => {
  // Chọn tuần sau để test chạy được bất kể thứ hoặc múi giờ của máy.
  weekStart = monday(7);
  days = new Date(weekStart + 'T00:00:00Z');
  state = {
    connections: new Map(), mappings: new Map(), schedule: new Map(), events: new Map(),
    googleCalls: [], tokenExchanges: 0,
    shifts: new Map([
      [1, { name: 'Ca sáng', start_hour: 8.5, end_hour: 12.25, archived_at: null }],
      [2, { name: 'Ca tối', start_hour: 21.5, end_hour: 24, archived_at: null }],
      [3, { name: 'Ca đêm', start_hour: 22.25, end_hour: 2.5, archived_at: null }],
    ]),
    employment: {
      id: EMPLOYMENT_ID, seeker_id: EMPLOYEE, position_id: 101, ended_at: null,
      position: { title: 'Pha chế', shop: { name: 'Quán thử', phone: '0900000000' } },
    },
  };
});

function date(offset) {
  const day = new Date(days);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

function api(path, { auth = 'seeker', method = 'GET', body, cookie } = {}) {
  return fetch(origin + '/api' + path, {
    method, redirect: 'manual',
    headers: {
      ...(auth && { authorization: 'Bearer ' + auth }),
      ...(body && { 'content-type': 'application/json' }),
      ...(cookie && { cookie }),
    },
    body: body && JSON.stringify(body),
  });
}

async function data(response, status = 200) {
  assert.equal(response.status, status);
  return (await response.json()).data;
}

async function oauthStart() {
  const response = await api('/google/connect');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Path=\/api\/google\/callback/);
  return { authUrl: new URL((await data(response)).url), cookie: setCookie.split(';')[0] };
}

async function connect() {
  const { authUrl, cookie } = await oauthStart();
  const response = await api('/google/callback?code=stub-code&state=' + authUrl.searchParams.get('state'), { auth: null, cookie });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/schedule.html?google=connected');
  await waitForSync();
}

function save(cells, manager = false) {
  return api('/employments/' + EMPLOYMENT_ID + (manager ? '/manage-schedule' : '/schedule'), {
    method: 'PUT', auth: manager ? 'employer' : 'seeker', body: { week_start: weekStart, cells },
  });
}

async function waitForSync(expected = 'idle') {
  const limit = Date.now() + 8000;
  let result;
  do {
    result = await data(await api('/google/status'));
    if (result.sync_status === expected) return result;
    await delay(30);
  } while (Date.now() < limit);
  assert.fail('Đang chờ trạng thái ' + expected + ', nhận được ' + JSON.stringify(result));
}

test('access log không chứa OAuth code hoặc state của callback', async (t) => {
  const { authUrl, cookie } = await oauthStart();
  const writes = t.mock.method(process.stdout, 'write', () => true);
  const response = await api('/google/callback?code=stub-code&state=' + authUrl.searchParams.get('state'), { auth: null, cookie });
  assert.equal(response.headers.get('location'), '/schedule.html?google=connected');
  await waitForSync();
  const log = writes.mock.calls.map((call) => String(call.arguments[0])).join('\n');
  assert.doesNotMatch(log, /stub-code|google\/callback/);
});

test('OAuth yêu cầu Bearer của nhân viên, PKCE và state hợp lệ', async () => {
  assert.equal((await api('/google/connect', { auth: null })).status, 401);
  assert.equal((await api('/google/connect', { auth: 'employer' })).status, 403);
  const { authUrl, cookie } = await oauthStart();
  assert.equal(authUrl.hostname, 'accounts.google.com');
  assert.equal(authUrl.searchParams.get('scope'), CALENDAR_SCOPE);
  assert.equal(authUrl.searchParams.get('access_type'), 'offline');
  assert.equal(authUrl.searchParams.get('prompt'), 'consent');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(authUrl.searchParams.get('code_challenge'));
  assert.equal(authUrl.searchParams.get('redirect_uri'), origin + '/api/google/callback');

  const rejected = await api('/google/callback?code=stub-code&state=other', { auth: null, cookie });
  assert.equal(rejected.headers.get('location'), '/schedule.html?google=expired');
  assert.equal(state.tokenExchanges, 0);
  await connect();
  assert.equal(state.tokenExchanges, 1);
  const status = await data(await api('/google/status'));
  assert.deepEqual(status, { available: true, status: 'active', sync_status: 'idle', auto_sync_manager_changes: true });
});

test('lưu hai lần vẫn một sự kiện, bỏ ô thì xóa và chọn lại tạo đúng một sự kiện', async () => {
  await connect();
  await data(await save([cell(1)]));
  await waitForSync();
  const [first] = state.events.values();
  assert.equal(first.summary, 'Quán thử – Pha chế (Ca sáng)');
  assert.doesNotMatch(JSON.stringify(first), /0900000000/);
  await data(await save([cell(1)]));
  await waitForSync();
  assert.equal(state.events.size, 1);
  assert.equal(state.googleCalls.filter((name) => name === 'insert').length, 1);
  assert.equal([...state.events.keys()][0], first.id);

  await data(await save([]));
  await waitForSync();
  assert.equal(state.events.size, 0);
  assert.equal([...state.mappings.values()][0].sync_status, 'deleted');
  await data(await save([cell(1)]));
  await waitForSync();
  assert.equal(state.events.size, 1);
});

test('giờ lẻ, 24:00 và ca qua đêm giữ đúng ngày và múi giờ Việt Nam', async () => {
  await connect();
  await data(await save([cell(1, 0), cell(2, 1), cell(3, 6)]));
  await waitForSync();
  const tz = 'Asia/Ho_Chi_Minh';
  const events = [...state.events.values()].map(({ start, end }) => [start.dateTime, start.timeZone, end.dateTime, end.timeZone]);
  assert.deepEqual(events, [
    [date(0) + 'T08:30:00', tz, date(0) + 'T12:15:00', tz],
    [date(1) + 'T21:30:00', tz, date(2) + 'T00:00:00', tz],
    [date(6) + 'T22:15:00', tz, date(7) + 'T02:30:00', tz],
  ]);
});

test('lỗi invalid_grant không gây lỗi lưu lịch và trả trạng thái cần kết nối lại', async () => {
  await connect();
  state.googleFailure = googleError(400, 'invalid_grant');
  assert.equal((await data(await save([cell(1)]))).total_hours, 7);
  const status = await waitForSync();
  assert.equal(status.status, 'revoked');
  assert.deepEqual(state.schedule.get(address(EMPLOYMENT_ID, weekStart)), [cell(1)]);
  assert.equal([...state.mappings.values()][0].last_error, 'invalid_grant');
});

test('lưu lại lịch không đổi vẫn phát hiện Google đã thu hồi quyền', async () => {
  await connect();
  await data(await save([cell(1)]));
  await waitForSync();
  const count = state.googleCalls.filter((name) => name !== 'verifyAccess').length;

  state.googleFailure = googleError(400, 'invalid_grant');
  await data(await save([cell(1)]));
  const status = await waitForSync();
  assert.equal(status.status, 'revoked');
  assert.equal(state.googleCalls.filter((name) => name !== 'verifyAccess').length, count);
  assert.equal(state.events.size, 1);
});

test('lưu lịch không chờ Google và lỗi giới hạn ghi trạng thái lỗi', async () => {
  await connect();
  let release;
  state.googleGate = new Promise((resolve) => { release = resolve; });
  const rateError = googleError(429);
  rateError.response.headers = new Headers({ 'retry-after': '10' });
  state.googleFailure = rateError;
  try {
    const response = await Promise.race([
      save([cell(1)]),
      delay(2000).then(() => { throw new Error('Lưu lịch đang chờ Google'); }),
    ]);
    assert.equal(response.status, 200);
    assert.equal((await waitForSync('syncing')).status, 'active');
  } finally {
    release();
  }
  await waitForSync('error');
  assert.equal([...state.mappings.values()][0].last_error, 'rate_limit');
});

test('chủ quán chỉnh lịch theo công tắc, xóa nhân viên thì xóa ca Google', async () => {
  await connect();
  await data(await save([cell(1)], true));
  await waitForSync();
  assert.equal(state.events.size, 1);

  await data(await api('/google/settings', { method: 'PUT', body: { auto_sync_manager_changes: false } }));
  await data(await save([cell(2)], true));
  await waitForSync();
  assert.match([...state.events.values()][0].summary, /Ca sáng/);

  await data(await api('/google/settings', { method: 'PUT', body: { auto_sync_manager_changes: true } }));
  await data(await save([cell(2)], true));
  await waitForSync();
  assert.equal(state.events.size, 1);
  assert.match([...state.events.values()][0].summary, /Ca tối/);

  await data(await api('/employments/' + EMPLOYMENT_ID, { method: 'DELETE', auth: 'employer' }));
  await waitForSync();
  assert.equal(state.events.size, 0);
});

test('kết nối đồng bộ từ hôm nay, ngắt kết nối giữ sự kiện đã tạo', async () => {
  const currentWeek = monday();
  const weekdayToday = Math.round((Date.parse(today()) - Date.parse(currentWeek)) / 86400000);
  state.schedule.set(address(EMPLOYMENT_ID, monday(-7)), [cell(1)]);
  state.schedule.set(address(EMPLOYMENT_ID, currentWeek), [cell(2, weekdayToday)]);
  state.schedule.set(address(EMPLOYMENT_ID, weekStart), [cell(3)]);
  await connect();
  assert.equal(state.events.size, 2);

  const disconnected = await data(await api('/google/disconnect', { method: 'DELETE' }));
  assert.equal(disconnected.status, 'disconnected');
  assert.equal(state.connections.has(EMPLOYEE), false);
  await data(await save([]));
  await waitForSync();
  assert.equal(state.events.size, 2);
});

test('Google đã xóa sự kiện hoặc ca thay đổi thì cập nhật ánh xạ', async () => {
  await connect();
  await data(await save([cell(1)]));
  await waitForSync();
  const [original] = state.events.keys();
  state.shifts.get(1).start_hour = 9.25;
  await data(await save([cell(1)]));
  await waitForSync();
  assert.equal(state.events.get(original).start.dateTime, date(0) + 'T09:15:00');

  state.events.delete(original);
  state.shifts.get(1).start_hour = 9.5;
  await data(await save([cell(1)]));
  await waitForSync();
  assert.equal(state.events.size, 1);
  assert.equal([...state.events.values()][0].start.dateTime, date(0) + 'T09:30:00');
});
