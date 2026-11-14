const { anon, forUser } = require('../config/supabase');
const buildModels = require('../models');
const { httpError } = require('../utils/db');

async function load(req, token) {
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) throw httpError(401, 'Token không hợp lệ hoặc đã hết hạn');
  req.token = token;
  req.user = data.user;
  req.db = forUser(token);
  req.m = buildModels(req.db);
}

const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;

/** Bắt buộc đăng nhập. */
async function requireAuth(req, res, next) {
  try {
    const token = bearer(req);
    if (!token) throw httpError(401, 'Cần đăng nhập');
    await load(req, token);
    next();
  } catch (e) {
    next(e);
  }
}

/** Đăng nhập không bắt buộc: có token thì dùng user, không thì dùng client anon. */
async function optionalAuth(req, res, next) {
  try {
    const token = bearer(req);
    if (token) await load(req, token);
    else {
      req.db = anon;
      req.m = buildModels(anon);
    }
    next();
  } catch (e) {
    next(e);
  }
}

/** Giới hạn theo vai (lấy từ metadata lúc đăng ký; quyền thật vẫn do RLS/RPC quyết định). */
const requireRole = (role) => (req, res, next) => {
  const r = req.user?.user_metadata?.role || 'seeker';
  if (r !== role) return next(httpError(403, `Chỉ tài khoản "${role}" mới dùng được chức năng này`));
  next();
};

module.exports = { requireAuth, optionalAuth, requireRole };
