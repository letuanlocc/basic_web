const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(requireAuth, requireRole('seeker'));
const ok = (res, data) => res.json({ success: true, data });

router.get('/mine', asyncHandler(async (req, res) => ok(res, await req.m.invitations.listMine(req.user.id, req.query.status))));

// body: { accept: true | false }
router.post('/:id/respond', asyncHandler(async (req, res) =>
  ok(res, { application_id: await req.m.invitations.respond(req.params.id, req.body.accept) })));

module.exports = router;
