function notFound(req, res, next) {
  const err = new Error(`Không tìm thấy: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Lỗi Postgres/Supabase: 23505 = trùng unique, 23503 = sai khóa ngoại
  let status = err.status || 500;
  if (err.code === '23505') status = 409;
  if (err.code === '23503') status = 400;
  // vi phạm CHECK / NOT NULL / sai kiểu dữ liệu: lỗi do dữ liệu người dùng gửi lên
  let message = err.message;
  if (err.code === '23514') { status = 400; message = 'Dữ liệu không hợp lệ: ' + (message.match(/constraint "([^"]+)"/)?.[1] || 'vi phạm ràng buộc'); }
  if (err.code === '23502') { status = 400; message = 'Thiếu thông tin bắt buộc' + (message.match(/column "([^"]+)"/) ? ': ' + message.match(/column "([^"]+)"/)[1] : ''); }
  if (err.code === 'PGRST202') { status = 500; message = 'Hệ thống chưa được cập nhật cơ sở dữ liệu (thiếu hàm ' + (message.match(/public\.(\w+)/)?.[1] || '') + '). Vui lòng báo quản trị viên chạy file SQL trong thư mục supabase/.'; }
  if (err.code === '22P02') { status = 400; message = 'Dữ liệu sai định dạng'; }
  // 22007 = sai định dạng ngày/giờ, 22008 = ngày/giờ ngoài phạm vi (vd 2026-13-45): lỗi do dữ liệu gửi lên, không lộ chi tiết Postgres
  if (err.code === '22007' || err.code === '22008') { status = 400; message = 'Ngày không hợp lệ (cần định dạng YYYY-MM-DD)'; }

  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message: message || 'Lỗi server', ...(err.extra || {}) });
}

module.exports = { notFound, errorHandler };
