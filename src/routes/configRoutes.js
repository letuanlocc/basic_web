const router = require('express').Router();

// Cấu hình công khai cho trình duyệt (các giá trị này vốn hiển thị phía client: Measurement ID, DSN trình duyệt).
// Không đặt bí mật ở đây.
router.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    success: true,
    data: {
      gaId: process.env.GA_MEASUREMENT_ID || null,
      sentryDsn: process.env.SENTRY_BROWSER_DSN || null,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || 'development',
    },
  });
});

module.exports = router;
