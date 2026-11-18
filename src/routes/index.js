const router = require('express').Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

router.use('/config', require('./configRoutes'));
// Chỉ bật khi đặt SENTRY_TEST=1: ném lỗi cố ý để kiểm tra Sentry (dùng khi quay video demo).
if (process.env.SENTRY_TEST === '1') router.get('/debug-error', () => { throw new Error('Lỗi thử nghiệm Sentry từ /api/debug-error'); });

router.use('/auth', require('./authRoutes'));
router.use('/me', require('./meRoutes'));
router.use('/positions', require('./positionRoutes'));
router.use('/shifts', require('./shiftRoutes'));
router.use('/applications', require('./applicationRoutes'));
router.use('/seekers', require('./seekerRoutes'));
router.use('/invitations', require('./invitationRoutes'));
router.use('/employments', require('./employmentRoutes'));
router.use('/google', require('./googleRoutes'));

module.exports = router;
