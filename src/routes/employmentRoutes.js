const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');

router.use(requireAuth);
const ok = (res, data) => res.json({ success: true, data });

// Việc tôi đang làm
router.get('/mine', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.employments.listMine(req.user.id))));

// Lưu lịch một tuần. body: { week_start: 'YYYY-MM-DD' (thứ Hai), cells: [{ shift_id, weekday }] }
router.put('/:id/schedule', requireRole('seeker'), validate('week_start', 'cells'), asyncHandler(async (req, res) =>
  ok(res, await req.m.employments.saveSchedule(req.params.id, req.body.week_start, req.body.cells))));

// Chủ quán xóa nhân viên khỏi danh sách
router.delete('/:id', requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.employments.remove(req.params.id))));

module.exports = router;
