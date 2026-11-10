const rateLimit = require('express-rate-limit');
const { httpError } = require('../utils/db');

/** Giới hạn theo IP. Quá giới hạn trả 429 kèm số giây phải chờ (cùng định dạng lỗi với phần còn lại). */
const byIp = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const wait = Number(res.getHeader('Retry-After')) || Math.ceil(windowMs / 1000);
      res.status(429).json({ success: false, retry_after: wait, message: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${wait} giây` });
    },
  });

/** Mỗi khóa (vd. email) chỉ được làm một việc mỗi `seconds` giây. Lưu trong bộ nhớ của server. */
const last = new Map();
function cooldown(key, seconds) {
  const now = Date.now();
  const prev = last.get(key);
  if (prev && now - prev < seconds * 1000) {
    const wait = Math.ceil((seconds * 1000 - (now - prev)) / 1000);
    const e = httpError(429, `Vui lòng chờ ${wait} giây trước khi gửi lại`);
    e.retry_after = wait;
    throw e;
  }
  last.set(key, now);
  if (last.size > 5000) for (const [k, t] of last) if (now - t > seconds * 1000) last.delete(k);
}

module.exports = { byIp, cooldown };
