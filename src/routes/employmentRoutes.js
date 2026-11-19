const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { httpError } = require('../utils/db');
const Calendar = require('../services/calendarSync');

router.use(requireAuth);
const ok = (res, data) => res.json({ success: true, data });

// Việc tôi đang làm
router.get('/mine', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.employments.listMine(req.user.id))));

// Nhân viên tô ca bận của một việc. body: { week_start, cells: [{ shift_id, weekday }] }
router.put('/:id/busy', requireRole('seeker'), validate('week_start', 'cells'), asyncHandler(async (req, res) => {
  await req.m.employments.assertActive(req.params.id, req.user.id);
  ok(res, await req.m.employments.setBusySlots(req.params.id, req.body.week_start, req.body.cells));
}));

// Lưu lịch một tuần. body: { week_start: 'YYYY-MM-DD' (thứ Hai), cells: [{ shift_id, weekday }] }
router.put('/:id/schedule', requireRole('seeker'), validate('week_start', 'cells'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { week_start: weekStart, cells } = req.body;
  await req.m.employments.assertActive(id, req.user.id);
  const saved = await req.m.employments.saveSchedule(id, weekStart, cells);
  Calendar.queueWeek(id, weekStart, { userId: req.user.id });
  ok(res, saved);
}));

// Chủ quán xem / chỉnh lịch một nhân viên: GET ?week_start=..., PUT { week_start, cells }
router.get('/:id/schedule', requireRole('employer'), asyncHandler(async (req, res) => {
  if (!req.query.week_start) throw httpError(400, 'Thiếu week_start (thứ Hai, YYYY-MM-DD)');
  ok(res, await req.m.employments.getCells(req.params.id, req.query.week_start));
}));
router.put('/:id/manage-schedule', requireRole('employer'), validate('week_start', 'cells'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { week_start: weekStart, cells, force } = req.body;
  const saved = await req.m.employments.manageSchedule(id, weekStart, cells, force === true);
  Calendar.queueWeek(id, weekStart, { managerOnly: true });
  ok(res, saved);
}));

// Ca nhân viên đang giữ ở việc khác trong tuần (để tô ô "Bận việc khác"): GET ?week_start=...
router.get('/:id/busy', asyncHandler(async (req, res) => {
  if (!req.query.week_start) throw httpError(400, 'Thiếu week_start (thứ Hai, YYYY-MM-DD)');
  ok(res, await req.m.employments.getBusy(req.params.id, req.query.week_start));
}));

// Chủ quán xóa nhân viên khỏi danh sách
router.delete('/:id', requireRole('employer'), asyncHandler(async (req, res) => {
  const removed = await req.m.employments.remove(req.params.id);
  Calendar.queueEmployment(req.params.id);
  ok(res, removed);
}));

module.exports = router;
