'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Page from '@/components/Page';
import { Msg, PasswordInput, useCountdown } from '@/components/AuthParts';
import { Auth, authApi, translate } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resend, setResend] = useState(null); // email cần gửi lại xác nhận
  const [left, setLeft] = useCountdown();

  // đã đăng nhập thì không cần vào trang này nữa
  useEffect(() => {
    const cur = Auth.get();
    if (cur && cur.user && cur.expires_at * 1000 > Date.now()) router.replace(Auth.home(Auth.role(cur.user)));
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const acc = f.acc.value.trim();
    const password = f.pw.value;
    setResend(null);
    if (!acc || !password) return setMsg({ text: 'Vui lòng nhập email (hoặc số điện thoại) và mật khẩu' });
    setBusy(true); setMsg(null);
    try {
      const d = await authApi('login', { email: acc, password });
      Auth.save(d.session, f.remember.checked);
      router.push(Auth.home(Auth.role(d.user)));
    } catch (err) {
      setBusy(false); setMsg({ text: translate(err.message) });
      if (/not confirmed/i.test(err.message) && acc.indexOf('@') > 0) setResend(acc);
    }
  }

  async function resendMail() {
    setLeft(60);
    try {
      await authApi('resend-confirmation', { email: resend });
      setMsg({ text: 'Đã gửi lại email xác nhận tới ' + resend + '. Hãy kiểm tra hộp thư (cả mục spam).', kind: 'info' });
    } catch (err) { setLeft(0); setMsg({ text: translate(err.message) }); }
  }

  return (
    <Page layout="plain" cta="register">
      <main className="stack-lg">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Trang chủ</Link> → <span>Đăng nhập</span></nav>
        <div className="row tw-justify-center tw-items-start tw-gap-6">
          <form className="form-card tw-flex-[1_1_360px] tw-max-w-[440px]" onSubmit={submit}>
            <div><h1>Chào mừng quay lại</h1><p className="lead">Đăng nhập để xem chi tiết công việc, ứng tuyển và đăng ký lịch làm.</p></div>
            <div className="field"><label htmlFor="acc">Email hoặc số điện thoại</label><input id="acc" name="acc" type="text" placeholder="ví dụ: ban@email.com hoặc 0912345678" autoComplete="username" /></div>
            <div className="field"><div className="row between tw-items-baseline"><label htmlFor="pw">Mật khẩu</label><Link className="link-btn" href="/forgot-password">Quên mật khẩu?</Link></div>
              <PasswordInput id="pw" name="pw" placeholder="••••••" autoComplete="current-password" /></div>
            <label className="remember"><input type="checkbox" id="remember" name="remember" defaultChecked /> Ghi nhớ đăng nhập trên thiết bị này</label>
            <Msg msg={msg} />
            {resend && <div><button type="button" className="btn" disabled={left > 0} onClick={resendMail}>Gửi lại email xác nhận{left > 0 ? ` (${left}s)` : ''}</button></div>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
            <p className="muted small tw-m-0 tw-text-center">Bạn chưa có tài khoản? <Link className="tw-font-bold" href="/register">Đăng ký ngay</Link></p>
          </form>
        </div>
      </main>
    </Page>
  );
}
