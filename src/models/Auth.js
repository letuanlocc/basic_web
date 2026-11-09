const { anon } = require('../config/supabase');
const { unwrap, httpError } = require('../utils/db');

/** Đăng ký / đăng nhập qua Supabase Auth (trigger handle_new_user tự tạo users + hồ sơ/cửa hàng). */
module.exports = {
  async register({ email, password, full_name, phone, role = 'seeker' }) {
    if (!['seeker', 'employer'].includes(role)) throw httpError(400, 'role phải là seeker hoặc employer');
    const ok = unwrap(await anon.rpc('phone_available', { p_phone: phone }));
    if (!ok) throw httpError(409, 'Số điện thoại không hợp lệ hoặc đã được sử dụng');

    const { data, error } = await anon.auth.signUp({
      email,
      password,
      options: { data: { full_name, phone, role } },
    });
    if (error) throw httpError(400, error.message);
    return { user: data.user, session: data.session };
  },

  async login({ email, password }) {
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error) throw httpError(401, error.message);
    return { user: data.user, session: data.session };
  },

  async refresh(refresh_token) {
    const { data, error } = await anon.auth.refreshSession({ refresh_token });
    if (error) throw httpError(401, error.message);
    return { session: data.session };
  },
};
