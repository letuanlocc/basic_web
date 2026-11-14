const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const { httpError, unwrap } = require('../utils/db');
const E = require('../services/positionEdit');

router.use(requireAuth, requireRole('employer'));
const ok = (res, data) => res.json({ success: true, data });

// Sửa / "xóa" (lưu trữ) một ca đều đi qua quy tắc sửa tin: không đổi giờ hay xóa ca đã có người đăng ký lịch.
async function positionOfShift(req, shiftId) {
  const row = unwrap(await req.db.from('shifts').select('position_id').eq('id', shiftId).is('archived_at', null).maybeSingle());
  if (!row) throw httpError(404, 'Không tìm thấy ca làm');
  return E.ownPosition(req, row.position_id);
}

router.put('/:id', asyncHandler(async (req, res) => {
  const p = await positionOfShift(req, req.params.id);
  const { name, start_hour, end_hour, confirm_sensitive } = req.body;
  const shifts = E.currentShifts(p).map((s) => (String(s.id) === req.params.id
    ? { ...s, ...(name !== undefined && { name }), ...(start_hour !== undefined && { start_hour }), ...(end_hour !== undefined && { end_hour }) }
    : s));
  ok(res, await E.editPosition(req, p.id, { shifts, confirm_sensitive }));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const p = await positionOfShift(req, req.params.id);
  const shifts = E.currentShifts(p).filter((s) => String(s.id) !== req.params.id);
  ok(res, await E.editPosition(req, p.id, { shifts, confirm_sensitive: req.query.confirm === '1' }));
}));

module.exports = router;
