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

  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message: err.message || 'Lỗi server' });
}

module.exports = { notFound, errorHandler };
