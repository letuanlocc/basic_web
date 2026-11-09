const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireAuth);
const ok = (res, data) => res.json({ success: true, data });

// Hồ sơ tôi đã nộp
router.get('/mine', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.applications.listMine(req.user.id))));

// Ứng viên hủy hồ sơ đang chờ
router.post('/:id/withdraw', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.applications.withdraw(req.params.id))));

// Chủ quán nhận/từ chối. body: { accept: true | false }
router.post('/:id/decision', requireRole('employer'), asyncHandler(async (req, res) =>
  ok(res, await req.m.applications.decide(req.params.id, req.body.accept))));

module.exports = router;
