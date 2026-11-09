const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireAuth, requireRole('employer'));
const ok = (res, data) => res.json({ success: true, data });

router.put('/:id', asyncHandler(async (req, res) => ok(res, await req.m.shifts.update(req.params.id, req.body))));
// "Xóa" = lưu trữ ca (archived_at)
router.delete('/:id', asyncHandler(async (req, res) => ok(res, await req.m.shifts.archive(req.params.id))));

module.exports = router;
