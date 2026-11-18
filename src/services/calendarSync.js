const { createHash, randomBytes } = require('node:crypto');
const { setTimeout: wait } = require('node:timers/promises');
const { waitUntil } = require('@vercel/functions');
const { admin } = require('../config/supabase');
const { unwrap } = require('../utils/db');
const { today, monday, fmtHour } = require('../utils/positionRules');
const Google = require('./googleCalendar');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const EVENT_KEY = 'employment_id,shift_id,week_start,weekday';
const APP_EVENT = 'caranhScheduleCell';
const SYNC_FAILED = 'calendar_sync_failed';
const jobs = new Map();
const pending = new Map();

function forUser(userId, task) {
  const result = (jobs.get(userId) || Promise.resolve()).then(task);
  const tail = result.catch(() => {});
  jobs.set(userId, tail);
  tail.then(() => {
    if (jobs.get(userId) === tail) jobs.delete(userId);
  });
  return result;
}

function report(error) {
  console.warn('Google Calendar: không hoàn tất công việc đồng bộ', error.code || error.name);
}

// Trên Vercel (serverless) hàm bị đóng băng ngay khi trả response, nên việc chạy nền phải đăng ký
// với waitUntil để nền tảng giữ hàm sống đến khi xong. Chạy local thì waitUntil không làm gì.
function inBackground(work) {
  if (!Google.available) return;
  const task = Promise.resolve().then(work).catch(report);
  try { waitUntil(task); } catch { /* không có ngữ cảnh Vercel */ }
}

function enqueue(userId, managerOnly, work) {
  pending.set(userId, (pending.get(userId) || 0) + 1);
  return forUser(userId, async () => {
    try {
      const connection = await Google.getConnection(userId);
      if (connection?.status !== 'active' || (managerOnly && !connection.auto_sync_manager_changes)) return;
      try {
        const calendar = Google.calendarClient(connection.refresh_token);
        const failed = await work(calendar);
        // Nếu lịch không có thay đổi, Calendar API chưa gửi request nào có thể phát hiện quyền bị thu hồi.
        // Sau khi đã gọi API, OAuth client tái dùng access token vừa lấy.
        if (!failed) await callGoogle(calendar.verifyAccess);
        await Google.updateConnection(userId, { last_error: failed ? SYNC_FAILED : null });
      } catch (error) {
        const needsReconnect = revoked(error);
        await Google.updateConnection(userId, {
          last_error: needsReconnect ? 'invalid_grant' : SYNC_FAILED,
          ...(needsReconnect && { status: 'revoked' }),
        });
        if (!needsReconnect) report(error);
      }
    } finally {
      const count = pending.get(userId) - 1;
      if (count) pending.set(userId, count);
      else pending.delete(userId);
    }
  });
}

function addDays(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function eventPayload(employment, assignment, workDate) {
  const { shift } = assignment;
  const start = Number(shift.start_hour);
  const end = Number(shift.end_hour);
  const endDate = end === 24 || end < start ? addDays(workDate, 1) : workDate;
  const stamp = (date, hour) => ({ dateTime: date + 'T' + fmtHour(hour) + ':00', timeZone: TIME_ZONE });
  return {
    summary: employment.position.shop.name + ' – ' + employment.position.title + ' (' + shift.name + ')',
    start: stamp(workDate, start),
    end: stamp(endDate, end === 24 ? 0 : end),
  };
}

const hash = (text) => createHash('sha256').update(text).digest('hex');
const keyOf = (row) => row.shift_id + ':' + row.weekday;
const status = (error) => Number(error.response?.status || error.code);
const missing = (error) => [404, 410].includes(status(error));
const revoked = (error) => error.response?.data?.error === 'invalid_grant';

function throttled(error) {
  const reasons = error.response?.data?.error?.errors || [];
  return status(error) === 429 || (status(error) === 403 &&
    reasons.some(({ reason }) => ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason)));
}

async function callGoogle(request) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= 2 || (!throttled(error) && !(status(error) >= 500))) throw error;
      const header = error.response?.headers?.get?.('retry-after');
      const seconds = Number(header);
      const retryAfter = Number.isFinite(seconds) ? seconds * 1000 : (Date.parse(header) - Date.now()) || 0;
      if (retryAfter > 5000) throw error;
      await wait(Math.max(retryAfter, (2 ** attempt) * 500 + Math.random() * 250));
    }
  }
}

async function putMapping(cell, patch) {
  unwrap(await admin.from('calendar_events').upsert({
    ...cell,
    ...patch,
    updated_at: new Date().toISOString(),
  }, { onConflict: EVENT_KEY, defaultToNull: false }));
}

async function findEvent(calendar, marker) {
  // Chỉ tìm ID sự kiện do CaRảnh tạo cho đúng ô lịch, kể cả khi người dùng đổi tài khoản rồi kết nối lại.
  let pageToken;
  do {
    const { data } = await callGoogle(() => calendar.events.list({
      calendarId: 'primary', fields: 'items(id),nextPageToken', showDeleted: false, maxResults: 1,
      privateExtendedProperty: [APP_EVENT + '=' + marker], pageToken,
    }));
    if (data.items?.[0]?.id) return data.items[0].id;
    pageToken = data.nextPageToken;
  } while (pageToken);
  return null;
}

async function syncEvent(calendar, cell, marker, previous, payload, force) {
  const payloadHash = hash(JSON.stringify(payload));
  if (!force && previous?.sync_status === 'synced' && previous.payload_hash === payloadHash) return;

  const requestBody = { ...payload, extendedProperties: { private: { [APP_EVENT]: marker } } };
  const patch = (eventId) => callGoogle(() => calendar.events.patch({
    calendarId: 'primary', eventId, requestBody, fields: 'id',
  }));
  let eventId = previous?.google_event_id;
  if (eventId && previous.sync_status !== 'deleted') {
    try {
      await patch(eventId);
      await putMapping(cell, { google_event_id: eventId, payload_hash: payloadHash, sync_status: 'synced', last_error: null });
      return;
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }

  eventId = await findEvent(calendar, marker);
  if (eventId) await patch(eventId);
  else {
    // Ghi ID trước khi gọi Google để retry không tạo trùng nếu Google đã nhận request nhưng app mất phản hồi.
    eventId = previous?.sync_status === 'pending' || previous?.sync_status === 'error' ? previous.google_event_id : null;
    if (!eventId) eventId = previous ? randomBytes(24).toString('hex') : marker;
    const insert = (id) => callGoogle(() => calendar.events.insert({
      calendarId: 'primary', requestBody: { ...requestBody, id }, fields: 'id',
    }));
    const reserve = (id) => putMapping(cell, { google_event_id: id, sync_status: 'pending', last_error: null });
    await reserve(eventId);
    try {
      await insert(eventId);
    } catch (error) {
      if (status(error) !== 409) throw error;
      try {
        await patch(eventId);
      } catch (conflict) {
        // ID từng bị xóa trên Google có thể vẫn được giữ lại dưới dạng sự kiện đã hủy.
        if (!missing(conflict)) throw conflict;
        eventId = randomBytes(24).toString('hex');
        await reserve(eventId);
        await insert(eventId);
      }
    }
  }
  await putMapping(cell, { google_event_id: eventId, payload_hash: payloadHash, sync_status: 'synced', last_error: null });
}

async function deleteEvent(calendar, previous, marker) {
  const remove = async (eventId) => {
    if (!eventId) return false;
    try {
      await callGoogle(() => calendar.events.delete({ calendarId: 'primary', eventId }));
      return true;
    } catch (error) {
      if (!missing(error)) throw error;
      return false;
    }
  };
  if (!(await remove(previous.google_event_id))) await remove(await findEvent(calendar, marker));
}

function employmentQuery() {
  return admin.from('employments').select('id,seeker_id,ended_at,position:positions(title,shop:shops(name))');
}

async function reconcileWeek(calendar, employment, weekStart, force = false) {
  const employmentId = employment.id;
  const [assignments, events] = await Promise.all([
    employment.ended_at ? [] : admin.from('shift_assignments')
      .select('shift_id,weekday,shift:shifts(name,start_hour,end_hour,archived_at)')
      .eq('employment_id', employmentId).eq('week_start', weekStart).then(unwrap),
    admin.from('calendar_events').select('shift_id,weekday,google_event_id,payload_hash,sync_status')
      .eq('employment_id', employmentId).eq('week_start', weekStart).then(unwrap),
  ]);
  const tracked = new Map(events.map((row) => [keyOf(row), row]));
  const desired = new Map(assignments.filter((row) => row.shift && !row.shift.archived_at).map((row) => [keyOf(row), row]));
  let failed = false;
  const firstDate = today();
  for (const [key, row] of new Map([...tracked, ...desired])) {
    const workDate = addDays(weekStart, row.weekday);
    if (workDate < firstDate) continue;
    const cell = { employment_id: employmentId, shift_id: row.shift_id, week_start: weekStart, weekday: row.weekday };
    const marker = hash([employment.seeker_id, employmentId, weekStart, key].join(':'));
    const previous = tracked.get(key);
    try {
      if (desired.has(key)) await syncEvent(calendar, cell, marker, previous, eventPayload(employment, row, workDate), force);
      else if (previous.sync_status !== 'deleted' || force) {
        await deleteEvent(calendar, previous, marker);
        await putMapping(cell, { payload_hash: null, sync_status: 'deleted', last_error: null });
      }
    } catch (error) {
      const lastError = revoked(error) ? 'invalid_grant' : throttled(error) ? 'rate_limit' : SYNC_FAILED;
      await putMapping(cell, { sync_status: 'error', last_error: lastError });
      if (revoked(error) || throttled(error)) throw error;
      failed = true;
    }
  }
  return failed;
}

async function syncEmployment(calendar, employment, force = false) {
  const firstWeek = monday();
  const [assignments, events] = await Promise.all([
    employment.ended_at ? [] : admin.from('shift_assignments').select('week_start')
      .eq('employment_id', employment.id).gte('week_start', firstWeek).order('week_start').then(unwrap),
    admin.from('calendar_events').select('week_start')
      .eq('employment_id', employment.id).gte('week_start', firstWeek).order('week_start').then(unwrap),
  ]);
  let failed = false;
  const weeks = new Set([...assignments, ...events].map((row) => row.week_start));
  for (const weekStart of weeks) {
    if (await reconcileWeek(calendar, employment, weekStart, force)) failed = true;
  }
  return failed;
}

async function syncWeek(employmentId, weekStart, { userId, managerOnly = false } = {}) {
  if (!Google.available) return;
  const employment = userId ? null : unwrap(await admin.from('employments').select('seeker_id')
    .eq('id', employmentId).maybeSingle());
  const owner = userId || employment?.seeker_id;
  if (!owner) return;
  return enqueue(owner, managerOnly, async (calendar) => {
    const current = unwrap(await employmentQuery().eq('id', employmentId).eq('seeker_id', owner).maybeSingle());
    return current ? reconcileWeek(calendar, current, weekStart) : false;
  });
}

function queueWeek(employmentId, weekStart, options) {
  inBackground(() => syncWeek(employmentId, weekStart, options));
}

function enqueueEmployment(employment, managerOnly) {
  return enqueue(employment.seeker_id, managerOnly, async (calendar) => {
    const current = unwrap(await employmentQuery().eq('id', employment.id)
      .eq('seeker_id', employment.seeker_id).maybeSingle());
    return current ? syncEmployment(calendar, current) : false;
  });
}

function queueEmployment(employmentId) {
  inBackground(async () => {
    const employment = unwrap(await admin.from('employments').select('id,seeker_id').eq('id', employmentId).maybeSingle());
    if (employment) await enqueueEmployment(employment, false);
  });
}

function queuePosition(positionId) {
  inBackground(async () => {
    const employments = unwrap(await admin.from('employments').select('id,seeker_id')
      .eq('position_id', positionId).is('ended_at', null));
    await Promise.all(employments.map((employment) => enqueueEmployment(employment, true)));
  });
}

function queueInitialSync(userId) {
  inBackground(() => enqueue(userId, false, async (calendar) => {
    const employments = unwrap(await employmentQuery().eq('seeker_id', userId));
    let failed = false;
    for (const employment of employments) {
      if (await syncEmployment(calendar, employment, true)) failed = true;
    }
    return failed;
  }));
}

async function getStatus(userId) {
  if (!Google.available) return { available: false };
  const connection = await Google.getConnection(userId);
  const connectionStatus = connection?.status || 'disconnected';
  const firstWeek = monday();
  const weekday = Math.round((Date.parse(today()) - Date.parse(firstWeek)) / 86400000);
  const errorRows = connectionStatus === 'active' && !connection.last_error && !pending.has(userId)
    ? unwrap(await admin.from('calendar_events').select('id,employments!inner(seeker_id)')
      .eq('employments.seeker_id', userId).eq('sync_status', 'error')
      .or('week_start.gt.' + firstWeek + ',and(week_start.eq.' + firstWeek + ',weekday.gte.' + weekday + ')').limit(1))
    : [];
  const syncStatus = connectionStatus !== 'active' ? 'idle'
    : pending.has(userId) ? 'syncing'
      : connection.last_error || errorRows.length ? 'error' : 'idle';
  return {
    available: true,
    status: connectionStatus,
    sync_status: syncStatus,
    auto_sync_manager_changes: connection?.auto_sync_manager_changes ?? true,
  };
}

module.exports = { forUser, syncWeek, queueWeek, queueEmployment, queuePosition, queueInitialSync, getStatus };
