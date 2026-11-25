'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Page from '@/components/Page';
import { Msg, PasswordInput, useCountdown } from '@/components/AuthParts';
import { IconShop, IconUser } from '@/components/Icons';
import { Auth, authApi, pwError, translate } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState('seeker');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resend, setResend] = useState(null);
  const [left, setLeft] = useCountdown();

  useEffect(() => {
    const cur = Auth.get();
    if (cur && cur.user && cur.expires_at * 1000 > Date.now()) router.replace(Auth.home(Auth.role(cur.user)));
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const v = (k) => f[k].value.trim();
    const name = v('name'), phone = v('phone').replace(/[\s.]/g, ''), email = v('email');
    const pw = f.pw.value, pw2 = f.pw2.value;
    setResend(null);
    if (!name || !phone || !email || !pw) return setMsg({ text: 'Vui lòng điền đủ các ô bắt buộc' });
    if (!/^0\d{9}$/.test(phone)) return setMsg({ text: 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0' });
    if (pwError(pw)) return setMsg({ text: pwError(pw) });
    if (pw !== pw2) return setMsg({ text: 'Mật khẩu nhập lại không khớp' });
    setBusy(true); setMsg(null);
    try {
      const d = await authApi('register', { email, password: pw, full_name: name, phone, role });
      if (!d.session) {
        setBusy(false);
        setMsg({ text: 'Đã tạo tài khoản. Hãy bấm liên kết xác nhận trong email rồi đăng nhập.', kind: 'info' });
        setResend(email);
        return;
      }
      Auth.save(d.session, true);
      router.push(role === 'employer' ? '/setup-employer' : '/setup-seeker');
    } catch (err) { setBusy(false); setMsg({ text: translate(err.message) }); }
  }

  async function resendMail() {
    setLeft(60);
    try {
      await authApi('resend-confirmation', { email: resend });
      setMsg({ text: 'Đã gửi lại email xác nhận tới ' + resend + '. Hãy kiểm tra hộp thư (cả mục spam).', kind: 'info' });
    } catch (err) { setLeft(0); setMsg({ text: translate(err.message) }); }
  }

  return (
    <Page layout="plain" cta="login">
      <main className="stack-lg">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Trang chủ</Link> → <span>Đăng ký</span></nav>
        <form className="form-card tw-self-center tw-max-w-[560px]" onSubmit={submit}>
          <div><h1>Tạo tài khoản</h1><p className="lead">Bước 1/2 · Thông tin đăng nhập</p></div>
          <fieldset><legend>Bạn là</legend>
            <div className="role-pick">
              <button type="button" aria-pressed={role === 'seeker'} onClick={() => setRole('seeker')}><IconUser /><strong className="tw-text-[16px]">Người tìm việc</strong><span>Tìm ca làm part-time</span></button>
              <button type="button" aria-pressed={role === 'employer'} className="dark" onClick={() => setRole('employer')}><IconShop /><strong className="tw-text-[16px]">Nhà tuyển dụng</strong><span>Đăng tin, duyệt ứng viên</span></button>
            </div></fieldset>
          <div className="field"><label htmlFor="name">Họ và tên</label><input id="name" name="name" type="text" placeholder="Nguyễn Văn A" /></div>
          <div className="cols">
            <div className="field"><label htmlFor="phone">Số điện thoại</label><input id="phone" name="phone" type="tel" placeholder="09xx xxx xxx" /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" placeholder="ban@email.com" /></div>
            <div className="field"><label htmlFor="pw">Mật khẩu</label><PasswordInput id="pw" name="pw" meter placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" /></div>
            <div className="field"><label htmlFor="pw2">Nhập lại mật khẩu</label><PasswordInput id="pw2" name="pw2" placeholder="••••••••" autoComplete="new-password" /></div>
          </div>
          <Msg msg={msg} />
          {resend && <div><button type="button" className="btn" disabled={left > 0} onClick={resendMail}>Gửi lại email xác nhận{left > 0 ? ` (${left}s)` : ''}</button></div>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Đang tạo tài khoản…' : role === 'employer' ? 'Tiếp tục · Thông tin cửa hàng' : 'Tiếp tục · Hồ sơ người tìm việc'}
          </button>
          <p className="muted small tw-m-0 tw-text-center">Đã có tài khoản? <Link className="tw-font-bold" href="/login">Đăng nhập</Link></p>
          <p className="tiny muted tw-m-0 tw-text-center">Xem trước bước 2: <Link href="/setup-seeker">hồ sơ người tìm việc</Link> · <Link href="/setup-employer">thông tin cửa hàng</Link></p>
        </form>
      </main>
    </Page>
  );
}
