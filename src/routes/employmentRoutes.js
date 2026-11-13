const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { httpError } = require('../utils/db');

router.use(requireAuth);
const ok = (res, data) => res.json({ success: true, data });

// Việc tôi đang làm
router.get('/mine', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.employments.listMine(req.user.id))));

// Lưu lịch một tuần. body: { week_start: 'YYYY-MM-DD' (thứ Hai), cells: [{ shift_id, weekday }] }
router.put('/:id/schedule', requireRole('seeker'), validate('week_start', 'cells'), asyncHandler(async (req, res) =>
  ok(res, await req.m.employments.saveSchedule(req.params.id, req.body.week_start, req.body.cells))));

// Chủ quán xem / chỉnh lịch một nhân viên: GET ?week_start=..., PUT { week_start, cells }
router.get('/:id/schedule', requireRole('employer'), asyncHandler(async (req, res) => {
  if (!req.query.week_start) throw httpError(400, 'Thiếu week_start (thứ Hai, YYYY-MM-DD)');
  ok(res, await req.m.employments.getCells(req.params.id, req.query.week_start));
}));
router.put('/:id/manage-schedule', requireRole('employer'), validate('week_start', 'cells'), asyncHandler(async (req, res) =>
  ok(res, await req.m.employments.manageSchedule(req.params.id, req.body.week_start, req.body.cells))));

// Chủ quán xóa nhân viên khỏi danh sách
router.delete('/:id', requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.employments.remove(req.params.id))));

module.exports = router;
