const { anon, admin, newAnon } = require('../config/supabase');
const { unwrap, httpError } = require('../utils/db');

/** Mật khẩu mới: tối thiểu 8 ký tự, có cả chữ và số. */
function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
    throw httpError(400, 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số');
  }
}

const needAdmin = () => {
  if (!admin) throw httpError(500, 'Thiếu SUPABASE_SECRET_KEY trên server');
};

/** Đăng ký / đăng nhập qua Supabase Auth (trigger handle_new_user tự tạo users + hồ sơ/cửa hàng). */
module.exports = {
  async register({ email, password, full_name, phone, role = 'seeker' }) {
    checkPassword(password);
    if (!['seeker', 'employer'].includes(role)) throw httpError(400, 'role phải là seeker hoặc employer');
    needAdmin();
    email = String(email).trim().toLowerCase();
    phone = String(phone).replace(/[\s.]/g, '');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Email không hợp lệ');
    if (!/^0\d{9}$/.test(phone)) throw httpError(400, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0');

    // Kiểm tra trùng trong public.users (secret key, bỏ qua RLS) TRƯỚC khi gọi signUp
    const byEmail = await admin.from('users').select('id').eq('email', email).limit(1);
    if (byEmail.error) throw httpError(500, 'Không kiểm tra được thông tin đăng ký, vui lòng thử lại');
    if (byEmail.data.length) throw httpError(400, 'Email này đã được sử dụng');
    const byPhone = await admin.from('users').select('id').eq('phone', phone).limit(1);
    if (byPhone.error) throw httpError(500, 'Không kiểm tra được thông tin đăng ký, vui lòng thử lại');
    if (byPhone.data.length) throw httpError(400, 'Số điện thoại này đã được đăng ký');

    const { data, error } = await newAnon().auth.signUp({
      email,
      password,
      options: { data: { full_name, phone, role } },
    });
    if (error) throw httpError(400, error.message);
    // Email đã có trong auth.users nhưng thiếu ở public.users: Supabase trả user "giả" (identities rỗng)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw httpError(400, 'Email này đã được sử dụng');
    }
    return { user: data.user, session: data.session };
  },

  /** `email` có thể là email hoặc số điện thoại 0xxxxxxxxx. */
  async login({ email, password }) {
    const phone = String(email).replace(/[\s.]/g, '');
    if (/^0\d{9}$/.test(phone)) {
      needAdmin();
      const { data } = await admin.from('users').select('email').eq('phone', phone).maybeSingle();
      if (!data?.email) throw httpError(401, 'Invalid login credentials');
      email = data.email;
    }
    const { data, error } = await newAnon().auth.signInWithPassword({ email, password });
    if (error) throw httpError(401, error.message);
    return { user: data.user, session: data.session };
  },

  async refresh(refresh_token) {
    const { data, error } = await newAnon().auth.refreshSession({ refresh_token });
    if (error) throw httpError(401, error.message);
    return { session: data.session };
  },

  /** Gửi email đặt lại mật khẩu. Luôn trả thành công để không lộ email nào đã đăng ký. */
  async forgotPassword(email, redirectTo) {
    const { error } = await newAnon().auth.resetPasswordForEmail(email, { redirectTo });
    if (error && /rate limit/i.test(error.message)) throw httpError(429, error.message);
    return { sent: true };
  },

  /** Đặt mật khẩu mới bằng access_token trong link email khôi phục. */
  async resetPassword(access_token, password) {
    needAdmin();
    checkPassword(password);
    const { data, error } = await anon.auth.getUser(access_token);
    if (error || !data.user) throw httpError(401, 'Liên kết đã hết hạn hoặc không hợp lệ');
    const { error: e2 } = await admin.auth.admin.updateUserById(data.user.id, { password });
    if (e2) throw httpError(400, e2.message);
    return { updated: true };
  },

  /** Đổi mật khẩu khi đang đăng nhập: phải đúng mật khẩu hiện tại. */
  async changePassword(user, current_password, new_password) {
    needAdmin();
    checkPassword(new_password);
    if (new_password === current_password) throw httpError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại');
    const { error } = await newAnon().auth.signInWithPassword({ email: user.email, password: current_password });
    if (error) throw httpError(400, 'Mật khẩu hiện tại không đúng');
    const { error: e2 } = await admin.auth.admin.updateUserById(user.id, { password: new_password });
    if (e2) throw httpError(400, e2.message);
    return { updated: true };
  },

  /** Gửi lại email xác nhận đăng ký. */
  async resendConfirmation(email) {
    const { error } = await newAnon().auth.resend({ type: 'signup', email });
    if (error && /rate limit/i.test(error.message)) throw httpError(429, error.message);
    return { sent: true };
  },

  async verifyPassword(user, password) {
    const { error } = await newAnon().auth.signInWithPassword({ email: user.email, password });
    if (error) throw httpError(400, 'Mật khẩu không đúng');
  },

  /** Đổi email đăng nhập (phải nhập đúng mật khẩu). */
  async changeEmail(user, password, new_email) {
    needAdmin();
    if (!/^\S+@\S+\.\S+$/.test(new_email)) throw httpError(400, 'Email mới không hợp lệ');
    await this.verifyPassword(user, password);
    const { error } = await admin.auth.admin.updateUserById(user.id, { email: new_email, email_confirm: true });
    if (error) throw httpError(400, /already|registered/i.test(error.message) ? 'Email này đã được đăng ký' : error.message);
    await admin.from('users').update({ email: new_email }).eq('id', user.id);
    return { updated: true };
  },

  /** Xóa vĩnh viễn tài khoản (phải nhập đúng mật khẩu). Dữ liệu liên quan xóa theo qua khóa ngoại. */
  async deleteAccount(user, password) {
    needAdmin();
    await this.verifyPassword(user, password);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw httpError(400, error.message);
    return { deleted: true };
  },
};
