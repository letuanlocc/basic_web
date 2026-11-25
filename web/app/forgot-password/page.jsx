'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Page from '@/components/Page';
import { Msg, useCountdown } from '@/components/AuthParts';
import { Auth, authApi, translate } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useCountdown();

  useEffect(() => {
    const cur = Auth.get();
    if (cur && cur.user && cur.expires_at * 1000 > Date.now()) router.replace(Auth.home(Auth.role(cur.user)));
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    const email = e.currentTarget.email.value.trim();
    if (!email) return setMsg({ text: 'Vui lòng nhập email' });
    setBusy(true); setMsg(null);
    try {
      await authApi('forgot-password', { email });
      setBusy(false);
      setMsg({ text: 'Nếu email này đã đăng ký, chúng tôi vừa gửi liên kết đặt lại mật khẩu. Hãy kiểm tra hộp thư (cả mục spam).', kind: 'info' });
      setLeft(60);
    } catch (err) {
      setBusy(false); setMsg({ text: translate(err.message) });
      if (err.status === 429) setLeft(err.retry_after || 60);
    }
  }

  const label = busy ? 'Đang gửi…' : 'Gửi liên kết đặt lại' + (left > 0 ? ` (${left}s)` : '');
  return (
    <Page layout="plain" cta="login">
      <main className="stack-lg">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Trang chủ</Link> → <Link href="/login">Đăng nhập</Link> → <span>Quên mật khẩu</span></nav>
        <form className="form-card tw-self-center tw-max-w-[440px] tw-w-full" onSubmit={submit}>
          <div><h1>Quên mật khẩu</h1><p className="lead">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới.</p></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" placeholder="ban@email.com" autoComplete="email" /></div>
          <Msg msg={msg} />
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy || left > 0}>{label}</button>
          <p className="muted small tw-m-0 tw-text-center"><Link className="tw-font-bold" href="/login">Quay lại đăng nhập</Link></p>
        </form>
      </main>
    </Page>
  );
}
