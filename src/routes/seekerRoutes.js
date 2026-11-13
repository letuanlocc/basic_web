const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/db');

router.use(requireAuth, requireRole('employer'));
const ok = (res, data) => res.json({ success: true, data });

// GET /api/seekers?q=&work_mode=online|offline|both&slots=morning,evening&has_experience=true&area=&min_lang=0-3&sort=updated|experience|age
router.get('/', asyncHandler(async (req, res) => ok(res, await req.m.seekers.search(req.query))));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await req.m.seekers.getPublic(req.params.id);
  if (!data) throw httpError(404, 'Không tìm thấy hồ sơ ứng viên');
  ok(res, data);
}));

module.exports = router;
