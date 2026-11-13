const router = require('express').Router();
const { requireAuth, optionalAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { httpError } = require('../utils/db');
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
    'max_week_hours', 'max_day_hours', 'max_shift_hours', 'max_per_shift', 'deadline', 'start_date',
    'contact_name', 'contact_phone'),
  asyncHandler(async (req, res) => {
    const shop = await req.m.shops.getMine(req.user.id);
    const { items, shifts, ...body } = req.body;
    const created = await req.m.positions.create(shop.id, body, items);
    for (const [i, sh] of (Array.isArray(shifts) ? shifts : []).entries()) {
      await req.m.shifts.create(created.id, { ...sh, sort_order: i });
    }
    ok(res, await req.m.positions.detail(created.id), 201);
  }));

router.put('/:id', requireAuth, requireRole('employer'), asyncHandler(async (req, res) => {
  const { items, ...body } = req.body;
  if (Array.isArray(items)) await req.m.positions.replaceItems(req.params.id, items);
  ok(res, await req.m.positions.update(req.params.id, body));
}));

router.post('/:id/close', requireAuth, requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.positions.setOpen(req.params.id, false))));
router.post('/:id/open', requireAuth, requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.positions.setOpen(req.params.id, true))));

router.get('/:id/applications', requireAuth, requireRole('employer'), asyncHandler(async (req, res) =>
  ok(res, await req.m.applications.listForPosition(req.params.id, req.query.status))));

router.get('/:id/employees', requireAuth, requireRole('employer'), asyncHandler(async (req, res) =>
  ok(res, await req.m.employments.listForPosition(req.params.id))));

router.post('/:id/invitations', requireAuth, requireRole('employer'), validate('seeker_id'), asyncHandler(async (req, res) =>
  ok(res, { invitation_id: await req.m.invitations.send(req.params.id, req.body.seeker_id, req.body.message) }, 201)));

router.get('/:id/shifts', optionalAuth, asyncHandler(async (req, res) => ok(res, await req.m.shifts.listByPosition(req.params.id))));
router.post('/:id/shifts', requireAuth, requireRole('employer'), validate('name', 'start_hour', 'end_hour'), asyncHandler(async (req, res) =>
  ok(res, await req.m.shifts.create(req.params.id, req.body), 201)));

// GET /api/positions/:id/schedule?week_start=YYYY-MM-DD (thứ Hai) – chủ quán hoặc nhân viên của vị trí
router.get('/:id/schedule', requireAuth, asyncHandler(async (req, res) => {
  if (!req.query.week_start) throw httpError(400, 'Thiếu week_start (thứ Hai, YYYY-MM-DD)');
  ok(res, await req.m.employments.getSchedule(req.params.id, req.query.week_start));
}));

module.exports = router;
