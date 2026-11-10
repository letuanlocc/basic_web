const router = require('express').Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

router.use('/auth', require('./authRoutes'));
router.use('/me', require('./meRoutes'));
router.use('/positions', require('./positionRoutes'));
router.use('/shifts', require('./shiftRoutes'));
router.use('/applications', require('./applicationRoutes'));
router.use('/seekers', require('./seekerRoutes'));
router.use('/invitations', require('./invitationRoutes'));
router.use('/employments', require('./employmentRoutes'));

module.exports = router;
