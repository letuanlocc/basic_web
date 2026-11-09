require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY trong file .env');
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

/** Client ẩn danh (role anon): đăng ký, đăng nhập, xem tin công khai. */
const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);

/**
 * Client chạy "như người dùng": gửi kèm JWT nên auth.uid() trong các RPC
 * và RLS hoạt động đúng. Mọi thao tác ghi của CaRảnh đều phải đi qua client này.
 */
const forUser = (token) =>
  createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    ...opts,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

/** Client quyền cao (bypass RLS, auth.uid() = null). Chỉ cho việc quản trị/cron, không dùng cho request của user. */
const admin = SUPABASE_SECRET_KEY ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, opts) : null;

module.exports = { anon, forUser, admin };
