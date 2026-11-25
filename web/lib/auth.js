// Phiên đăng nhập phía trình duyệt + gọi API có token (bản Next.js của public/js/auth.js).
// Token vẫn nằm ở localStorage (ghi nhớ) hoặc sessionStorage (đến khi đóng trình duyệt), giống bản cũ.
const KEY = 'cr_session';

const hasWindow = () => typeof window !== 'undefined';

function pick() {
  try { if (sessionStorage.getItem(KEY)) return sessionStorage; } catch (e) { /* bỏ qua */ }
  return localStorage;
}

export const Auth = {
  get() {
    if (!hasWindow()) return null;
    try { return JSON.parse(sessionStorage.getItem(KEY) || localStorage.getItem(KEY)); } catch (e) { return null; }
  },
  // remember: true/false khi đăng nhập; bỏ trống thì giữ nguyên nơi lưu hiện tại (vd. khi làm mới token)
  save(s, remember) {
    try {
      const keep = remember === undefined ? pick() : (remember ? localStorage : sessionStorage);
      localStorage.removeItem(KEY); sessionStorage.removeItem(KEY);
      keep.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* bỏ qua */ }
  },
  clear() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ } },
  role(user) { return (user && user.user_metadata && user.user_metadata.role) || 'seeker'; },
  home(role) { return role === 'employer' ? '/candidates' : '/jobs'; },
  valid(sess) { return !!(sess && sess.access_token && sess.expires_at * 1000 > Date.now() + 10000); },

  // Làm mới token bằng refresh_token; trả về session mới hoặc null
  async refresh() {
    const cur = Auth.get();
    if (!cur || !cur.refresh_token) return null;
    try {
      const r = await fetch('/api/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: cur.refresh_token }),
      });
      const j = await r.json();
      if (!j.success || !j.data.session) { Auth.clear(); return null; }
      Auth.save(j.data.session);
      return j.data.session;
    } catch (e) { return null; }
  },

  // Phiên còn dùng được (làm mới nếu cần), hoặc null
  async session() {
    const sess = Auth.get();
    return Auth.valid(sess) ? sess : Auth.refresh();
  },

  // Gọi API có token. Hết hạn thì tự làm mới; không được thì về trang đăng nhập.
  async call(method, url, body) {
    const go = async (sess) => {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.access_token },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await r.json().catch(() => ({}));
      return { status: r.status, json };
    };
    const toLogin = () => { Auth.clear(); window.location.replace('/login'); return new Promise(() => {}); };
    const s0 = await Auth.session();
    if (!s0) return toLogin();
    let res = await go(s0);
    if (res.status === 401) {
      const s1 = await Auth.refresh();
      if (!s1) return toLogin();
      res = await go(s1);
    }
    if (!res.json.success) {
      const e = new Error((res.json && res.json.message) || 'Có lỗi xảy ra, vui lòng thử lại');
      e.status = res.status;
      throw e;
    }
    return res.json.data;
  },
};

// Gọi /api/auth/<path> không cần token (đăng nhập, đăng ký, quên mật khẩu…)
export async function authApi(path, body) {
  const r = await fetch('/api/auth/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) {
    const e = new Error(j.error || j.message || 'Có lỗi xảy ra, vui lòng thử lại');
    e.status = r.status; e.retry_after = j.retry_after;
    throw e;
  }
  return j.data;
}

// API công khai (không cần đăng nhập): trả data hoặc ném lỗi
export async function pub(url) {
  const r = await fetch(url);
  const j = await r.json();
  if (!j.success) throw new Error(j.message || 'Có lỗi xảy ra');
  return j.data;
}

export function translate(msg) {
  const map = {
    'Invalid login credentials': 'Email/số điện thoại hoặc mật khẩu không đúng',
    'Email not confirmed': 'Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn',
    'User already registered': 'Email này đã được sử dụng',
  };
  if (/is invalid$/.test(msg)) return 'Email không hợp lệ hoặc tên miền không được chấp nhận';
  if (/rate limit/i.test(msg)) return 'Hệ thống gửi email đang quá tải, vui lòng thử lại sau ít phút';
  return map[msg] || msg;
}

export function pwError(pw) {
  if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số';
  return '';
}
