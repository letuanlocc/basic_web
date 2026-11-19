// Khởi tạo Sentry TRƯỚC mọi module khác (require đầu tiên ở src/app.js).
// Không đặt SENTRY_DSN thì không nạp thư viện Sentry (nhanh hơn lúc khởi động) và app chạy như bình thường.
require('dotenv').config();

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    // 10% request được theo dõi hiệu năng; lỗi thì luôn gửi.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    // Không gửi IP, cookie, header, body của người dùng.
    sendDefaultPii: false,
  });
  module.exports = Sentry;
} else {
  module.exports = { setupExpressErrorHandler() {}, flush: async () => true };
}
