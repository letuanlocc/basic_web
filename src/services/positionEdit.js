// Sửa tin tuyển – mọi đường sửa (PUT /positions/:id, /positions/:id/shifts, /shifts/:id) đều đi qua đây.
// Nhóm trường:
//  - tự do: tiêu đề, mô tả, nhiệm vụ/yêu cầu/quyền lợi, người liên hệ, SĐT…
//  - có điều kiện: hạn ứng tuyển (không ở quá khứ), số người cần tuyển (>= số đã nhận)
//  - nhạy cảm: lương, ngày làm, ca, giờ mở/đóng cửa → đã có hồ sơ/nhân viên thì phải gửi confirm_sensitive: true
//  - khóa cứng: không xóa / đổi giờ ca, không bỏ ngày làm đã có người đăng ký lịch (tuần này + tuần sau)
// Không bao giờ đổi is_open ở đây (dùng /close, /open).
const { httpError, pick } = require('../utils/db');
const R = require('../utils/positionRules');
const { FIELDS } = require('../models/Position');

const DAY = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const LIGHT = ['schedule_note', 'contact_name', 'contact_phone'];

async function ownPosition(req, id) {
  const [p, shop] = await Promise.all([req.m.positions.detail(id), req.m.shops.getMine(req.user.id)]);
  if (!p) throw httpError(404, 'Không tìm thấy tin tuyển');
  if (!shop || String(p.shop_id) !== String(shop.id)) throw httpError(403, 'Bạn không có quyền sửa tin này');
  return p;
}

/** Ai đang gắn với tin: hồ sơ chờ, người đã nhận, nhân viên, ca/ngày đã có người đăng ký lịch. */
async function usage(req, p) {
  const [emps, thisWeek, nextWeek] = await Promise.all([
    req.m.employments.listForPosition(p.id),
    req.m.employments.getSchedule(p.id, R.monday(0)),
    req.m.employments.getSchedule(p.id, R.monday(7)),
  ]);
  const shifts = new Set();
  const days = new Set();
  [...(thisWeek || []), ...(nextWeek || [])].forEach((c) => {
    if (Number(c.people) > 0) { shifts.add(String(c.shift_id)); days.add(Number(c.weekday)); }
  });
  const filled = Number(p.filled) || 0;
  const pending = Number(p.pending) || 0;
  const employees = (emps || []).length;
  return {
    filled, pending, employees,
    has_people: filled > 0 || pending > 0 || employees > 0,
    locked_shifts: [...shifts] /* chuỗi */, locked_days: [...days],
  };
}

/**
 * input: { ...trường của positions, items?, shifts?: [{id?, name, start_hour, end_hour}], confirm_sensitive? }
 * Trả chi tiết tin sau khi lưu. Lỗi 409 code CONFIRM_SENSITIVE nếu cần xác nhận.
 */
async function editPosition(req, id, input) {
  const cur = await ownPosition(req, id);
  const { items, shifts, confirm_sensitive: confirmed, ...body } = input || {};

  const patch = pick(body, FIELDS);
  delete patch.is_open;
  delete patch.max_shift_hours; // tự tính lại từ ca
  // contact_* không đọc được từ overview nên luôn giữ; trường khác bỏ nếu không đổi
  Object.keys(patch).forEach((k) => {
    if (k !== 'contact_name' && k !== 'contact_phone' && R.same(patch[k], cur[k])) delete patch[k];
  });
  if (patch.contact_phone !== undefined) patch.contact_phone = String(patch.contact_phone || '').replace(/[\s.]/g, '');

  let plan = null;
  if (Array.isArray(shifts)) {
    try { plan = R.planShifts(cur.shifts || [], shifts); } catch (e) { throw httpError(400, e.message); }
  }
  const shiftsChanged = !!plan && plan.added.length + plan.removed.length + plan.retimed.length > 0;
  const sensitive = R.SENSITIVE.filter((k) => k in patch);
  if (shiftsChanged) sensitive.push('shifts');

  const u = sensitive.length || 'headcount' in patch || plan ? await usage(req, cur) : null;

  // Có điều kiện
  if ('headcount' in patch) {
    const head = R.num(patch.headcount);
    if (head === null || head < u.filled) throw httpError(400, `Số người cần tuyển không được thấp hơn số người đã nhận (${u.filled})`);
  }
  if ('deadline' in patch && (!patch.deadline || patch.deadline < R.today())) {
    throw httpError(400, 'Hạn ứng tuyển mới không được ở trong quá khứ');
  }

  // Khóa cứng: ca / ngày đã có người đăng ký lịch
  if (u && plan) {
    const locked = new Set(u.locked_shifts.map(String));
    const gone = plan.removed.find((s) => locked.has(String(s.id)));
    if (gone) throw httpError(409, `Không thể xóa ca "${gone.name}" vì đã có nhân viên đăng ký lịch tuần này hoặc tuần sau`);
    const moved = plan.retimed.find((s) => locked.has(String(s.id)));
    if (moved) throw httpError(409, `Không thể đổi giờ ca "${moved.name}" vì đã có nhân viên đăng ký lịch tuần này hoặc tuần sau`);
  }
  if (u && 'work_days' in patch) {
    const next = new Set((patch.work_days || []).map(Number));
    const dropped = u.locked_days.filter((d) => !next.has(d));
    if (dropped.length) throw httpError(409, `Không thể bỏ ngày ${dropped.map((d) => DAY[d]).join(', ')} vì đã có nhân viên đăng ký lịch`);
  }

  // Nhạy cảm: đã có người thì phải xác nhận
  if (sensitive.length && u.has_people && confirmed !== true) {
    const e = httpError(409, `Tin đã có ${u.pending} hồ sơ chờ, ${u.filled} người đã nhận. Bạn đang đổi ${sensitive.map((k) => R.SENSITIVE_LABEL[k]).join(', ')} – cần xác nhận trước khi lưu.`);
    e.extra = { code: 'CONFIRM_SENSITIVE', fields: sensitive };
    throw e;
  }

  // Kiểm tra toàn bộ tin sau khi gộp. Chỉ sửa ghi chú lịch / liên hệ thì chỉ bắt lỗi phần liên hệ.
  const light = Object.keys(patch).every((k) => LIGHT.includes(k)) && !plan && !Array.isArray(items);
  const merged = { ...cur, ...patch, shifts: plan ? plan.final : cur.shifts, items: Array.isArray(items) ? items : cur.items };
  const problem = R.validatePosition(merged);
  if (problem && (!light || /liên hệ/i.test(problem))) throw httpError(400, problem);
  if (plan) patch.max_shift_hours = Math.max(...plan.final.map((s) => s.end_hour - s.start_hour));

  if (!plan) {
    if (Object.keys(patch).length) await req.m.positions.update(id, patch);
  } else {
    // Trigger DB kiểm tra ca theo giờ mở cửa / độ dài ca hiện hành (positions_validate, shifts_validate).
    // Pha 1: nới giờ mở/đóng cửa và độ dài ca tối đa (hợp cả ca cũ lẫn ca mới) → sửa ca → pha 2: đặt giá trị cuối.
    const v = (k) => R.num(k in patch ? patch[k] : cur[k]);
    const widest = {
      open_hour: Math.min(R.num(cur.open_hour), v('open_hour')),
      close_hour: Math.max(R.num(cur.close_hour), v('close_hour')),
      max_shift_hours: Math.max(R.num(cur.max_shift_hours) || 0, patch.max_shift_hours),
      max_day_hours: Math.max(R.num(cur.max_day_hours), v('max_day_hours')),
    };
    await req.m.positions.update(id, { ...patch, ...widest });
    for (const s of plan.removed) await req.m.shifts.archive(s.id);
    const changed = new Set([...plan.retimed, ...plan.renamed].map((s) => s.id));
    for (const s of plan.final) if (s.id && changed.has(s.id)) await req.m.shifts.update(s.id, s);
    for (const s of plan.added) await req.m.shifts.create(id, s);
    const final = {};
    Object.keys(widest).forEach((k) => {
      const want = k === 'max_shift_hours' ? patch.max_shift_hours : v(k);
      if (want !== widest[k]) final[k] = want;
    });
    if (Object.keys(final).length) await req.m.positions.update(id, final);
  }
  if (Array.isArray(items)) await req.m.positions.replaceItems(id, items);
  return req.m.positions.detail(id);
}

/** Danh sách ca hiện tại ở dạng gửi lên editPosition (giữ id). */
function currentShifts(p) {
  return (p.shifts || []).map((s) => ({ id: s.id, name: s.name, start_hour: s.start_hour, end_hour: s.end_hour }));
}

module.exports = { ownPosition, usage, editPosition, currentShifts };
