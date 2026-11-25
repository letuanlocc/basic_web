'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Page from '@/components/Page';
import { Msg, PasswordInput } from '@/components/AuthParts';
import { Auth, authApi, pwError, translate } from '@/lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useRef('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Supabase gắn token vào phần # của link trong email
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    token.current = h.get('access_token') || '';
    if (h.get('error_description')) setMsg({ text: 'Liên kết đã hết hạn hoặc không hợp lệ. Hãy yêu cầu liên kết mới.' });
    else if (!token.current) setMsg({ text: 'Không tìm thấy liên kết khôi phục. Hãy mở liên kết trong email, hoặc yêu cầu liên kết mới.' });
    window.history.replaceState(null, '', window.location.pathname); // không để token nằm trên thanh địa chỉ
  }, []);

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const pw = f.pw.value, pw2 = f.pw2.value;
    if (!token.current) return setMsg({ text: 'Liên kết không hợp lệ. Hãy yêu cầu liên kết mới.' });
    if (pwError(pw)) return setMsg({ text: pwError(pw) });
    if (pw !== pw2) return setMsg({ text: 'Mật khẩu nhập lại không khớp' });
    setBusy(true); setMsg(null);
    try {
      await authApi('reset-password', { access_token: token.current, password: pw });
      Auth.clear();
      setMsg({ text: 'Đã đổi mật khẩu. Đang chuyển đến trang đăng nhập…', kind: 'info' });
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) { setBusy(false); setMsg({ text: translate(err.message) }); }
  }

  return (
    <Page layout="plain" cta="login">
      <main className="stack-lg">
        <form className="form-card tw-self-center tw-max-w-[440px] tw-w-full" onSubmit={submit}>
          <div><h1>Đặt mật khẩu mới</h1><p className="lead">Nhập mật khẩu mới cho tài khoản của bạn.</p></div>
          <div className="field"><label htmlFor="pw">Mật khẩu mới</label><PasswordInput id="pw" name="pw" meter placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" /></div>
          <div className="field"><label htmlFor="pw2">Nhập lại mật khẩu</label><PasswordInput id="pw2" name="pw2" placeholder="••••••••" autoComplete="new-password" /></div>
          <Msg msg={msg} />
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu'}</button>
          <p className="muted small tw-m-0 tw-text-center"><Link className="tw-font-bold" href="/forgot-password">Yêu cầu liên kết mới</Link></p>
        </form>
      </main>
    </Page>
  );
}
