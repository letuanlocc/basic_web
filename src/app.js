const Sentry = require('./instrument'); // phải đứng đầu để Sentry bắt được mọi lỗi
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Chạy sau proxy/hosting (Render, Railway…) thì đặt TRUST_PROXY=1 để nhận đúng IP người dùng
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
// CSP tắt vì giao diện dùng style/onclick nội tuyến và font Google; các header bảo mật khác vẫn bật
// COOP same-origin và Origin-Agent-Cluster làm Chrome đổi tiến trình khi điều hướng, khiến Lighthouse/DevTools mất mốc
// navigationStart (lỗi NO_NAVSTART, không đo được Performance). Trang không dùng popup liên origin nên tắt hai header này.
app.use(helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: false, originAgentCluster: false }));
// Giao diện chạy cùng origin nên mặc định không mở CORS; cần thì đặt CORS_ORIGIN=https://a.com,https://b.com
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false }));
// Callback nhận OAuth code trong query string, không ghi URL này vào access log.
app.use(morgan('dev', { skip: (req) => /^\/api\/google\/callback\/?$/i.test(req.originalUrl.split('?')[0]) }));
// Ảnh (nơi làm việc, ảnh thẻ) gửi lên dạng data URL đã nén ở trình duyệt nên cần giới hạn lớn hơn mặc định 100kb
// Nén gzip/br cho HTML, CSS, JS, JSON (Lighthouse: Enable text compression)
app.use(compression());
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));
// File tĩnh không đổi tên theo phiên bản, nên chỉ cache ngắn (5 phút) để sửa xong không bị kẹt bản cũ.
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '5m',
  // HTML: trình duyệt luôn hỏi lại, CDN giữ 5 phút (Vercel xóa cache khi deploy bản mới)
  setHeaders(res, file) {
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  },
}));

app.use('/api', routes);

app.use(notFound);
// Gửi lỗi 5xx lên Sentry (không làm gì nếu chưa đặt SENTRY_DSN); đặt trước errorHandler.
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

module.exports = app;
