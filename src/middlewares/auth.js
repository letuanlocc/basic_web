const { anon, forUser } = require('../config/supabase');
const buildModels = require('../models');
const { httpError } = require('../utils/db');

/**
 * Xác thực token. Ưu tiên kiểm tra chữ ký bằng JWKS (có cache, không gọi mạng mỗi request);
 * không được thì hỏi Supabase (getUser). Đánh đổi: user bị khóa/xóa vẫn dùng được token đến khi nó hết hạn.
 */
async function resolveUser(token) {
  try {
    const { data } = await anon.auth.getClaims(token);
    const c = data && data.claims;
    if (c && c.sub && c.role === 'authenticated') {
      return { id: c.sub, email: c.email, phone: c.phone, app_metadata: c.app_metadata || {}, user_metadata: c.user_metadata || {} };
    }
  } catch (e) { /* rơi xuống getUser */ }
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) throw httpError(401, 'Token không hợp lệ hoặc đã hết hạn');
  return data.user;
}

async function load(req, token) {
  req.token = token;
  req.user = await resolveUser(token);
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
