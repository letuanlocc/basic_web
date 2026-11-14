const router = require('express').Router();
const { requireAuth, optionalAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { httpError } = require('../utils/db');
const R = require('../utils/positionRules');
const E = require('../services/positionEdit');
const { analyze } = require('../utils/ner');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ---- Công khai ----
// GET /api/positions?q=&mode=online|offline&sort=new|salary&limit=6&offset=0
router.get('/', optionalAuth, asyncHandler(async (req, res) => ok(res, await req.m.positions.search(req.query))));

// GET /api/positions/parse?q=... → { keyword, entities: [{text, label}], source } (NER cho thanh tìm kiếm)
router.get('/parse', asyncHandler(async (req, res) => ok(res, await analyze(req.query.q))));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const data = await req.m.positions.detail(req.params.id);
  if (!data) throw httpError(404, 'Không tìm thấy tin tuyển');
  ok(res, data);
}));

// ---- Cần đăng nhập ----
router.get('/:id/contact', requireAuth, asyncHandler(async (req, res) => ok(res, await req.m.positions.getContact(req.params.id))));

router.post('/:id/apply', requireAuth, requireRole('seeker'), asyncHandler(async (req, res) =>
  ok(res, { application_id: await req.m.applications.apply(req.params.id) }, 201)));

// ---- Nhà tuyển dụng ----
// body: { title, mode, headcount, deadline, start_date, contact_name, contact_phone, work_days, ..., items: [{kind, content}], shifts: [{name, start_hour, end_hour}] }
router.post('/', requireAuth, requireRole('employer'),
  validate('title', 'mode', 'headcount', 'pending_limit', 'open_hour', 'close_hour', 'min_week_hours',
    'max_week_hours', 'max_day_hours', 'max_per_shift', 'deadline', 'start_date',
    'contact_name', 'contact_phone'),
  asyncHandler(async (req, res) => {
    const shop = await req.m.shops.getMine(req.user.id);
    const { items, shifts, ...body } = req.body;
    const list = Array.isArray(shifts) ? shifts : [];
    const problem = R.validatePosition({ ...body, shifts: list, items: Array.isArray(items) ? items : [] }, { requireContact: true });
    if (problem) throw httpError(400, problem);
    if (body.deadline < R.today()) throw httpError(400, 'Hạn ứng tuyển không được ở trong quá khứ');
    body.max_shift_hours = Math.max(...list.map((sh) => R.num(sh.end_hour) - R.num(sh.start_hour)));
    delete body.is_open; // tin mới luôn mở (mặc định ở DB)
    const created = await req.m.positions.create(shop.id, body, items);
    for (const [i, sh] of list.entries()) {
      await req.m.shifts.create(created.id, { ...sh, sort_order: i });
    }
    ok(res, await req.m.positions.detail(created.id), 201);
  }));

// ---- Sửa tin (quy tắc ở services/positionEdit.js) ----
router.get('/:id/edit-info', requireAuth, requireRole('employer'), asyncHandler(async (req, res) =>
  ok(res, await E.usage(req, await E.ownPosition(req, req.params.id)))));

router.put('/:id', requireAuth, requireRole('employer'), asyncHandler(async (req, res) =>
  ok(res, await E.editPosition(req, req.params.id, req.body))));

router.post('/:id/close', requireAuth, requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.positions.setOpen(req.params.id, false))));
router.post('/:id/open', requireAuth, requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.positions.setOpen(req.params.id, true))));

router.get('/:id/applications', requireAuth, requireRole('employer'), asyncHandler(async (req, res) =>
  ok(res, await req.m.applications.listForPosition(req.params.id, req.query.status))));

router.get('/:id/employees', requireAuth, requireRole('employer'), asyncHandler(async (req, res) =>
  ok(res, await req.m.employments.listForPosition(req.params.id))));

router.post('/:id/invitations', requireAuth, requireRole('employer'), validate('seeker_id'), asyncHandler(async (req, res) =>
  ok(res, { invitation_id: await req.m.invitations.send(req.params.id, req.body.seeker_id, req.body.message) }, 201)));

router.get('/:id/shifts', optionalAuth, asyncHandler(async (req, res) => ok(res, await req.m.shifts.listByPosition(req.params.id))));
// Thêm một ca = sửa tin (cùng quy tắc giờ mở cửa / xác nhận khi đã có người)
router.post('/:id/shifts', requireAuth, requireRole('employer'), validate('name', 'start_hour', 'end_hour'), asyncHandler(async (req, res) => {
  const p = await E.ownPosition(req, req.params.id);
  const { name, start_hour, end_hour, confirm_sensitive } = req.body;
  ok(res, await E.editPosition(req, p.id, { shifts: [...E.currentShifts(p), { name, start_hour, end_hour }], confirm_sensitive }), 201);
}));

// GET /api/positions/:id/schedule?week_start=YYYY-MM-DD (thứ Hai) – chủ quán hoặc nhân viên của vị trí
router.get('/:id/schedule', requireAuth, asyncHandler(async (req, res) => {
  if (!req.query.week_start) throw httpError(400, 'Thiếu week_start (thứ Hai, YYYY-MM-DD)');
  ok(res, await req.m.employments.getSchedule(req.params.id, req.query.week_start));
}));

module.exports = router;
