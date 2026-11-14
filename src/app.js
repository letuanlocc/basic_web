const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Chạy sau proxy/hosting (Render, Railway…) thì đặt TRUST_PROXY=1 để nhận đúng IP người dùng
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
// CSP tắt vì giao diện dùng style/onclick nội tuyến và font Google; các header bảo mật khác vẫn bật
app.use(helmet({ contentSecurityPolicy: false }));
// Giao diện chạy cùng origin nên mặc định không mở CORS; cần thì đặt CORS_ORIGIN=https://a.com,https://b.com
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false }));
app.use(morgan('dev'));
// Ảnh (nơi làm việc, ảnh thẻ) gửi lên dạng data URL đã nén ở trình duyệt nên cần giới hạn lớn hơn mặc định 100kb
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
