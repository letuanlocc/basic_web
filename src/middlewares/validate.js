// Kiểm tra các field bắt buộc trong req.body
module.exports = (...fields) => (req, res, next) => {
  const missing = fields.filter((f) => req.body[f] === undefined || req.body[f] === '');
  if (missing.length) {
    const err = new Error(`Thiếu trường: ${missing.join(', ')}`);
    err.status = 400;
    return next(err);
  }
  next();
};
