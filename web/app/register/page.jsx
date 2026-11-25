'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Page from '@/components/Page';
import { Msg, PasswordInput, useCountdown } from '@/components/AuthParts';
import { IconShop, IconUser } from '@/components/Icons';
import { Auth, authApi, pwError, translate } from '@/lib/auth';

const FIELDS = ['name', 'phone', 'email', 'pw', 'pw2'];

// Lỗi server thuộc về ô nào (trùng email/SĐT, email bị từ chối…); null = lỗi chung, hiện ở khung trên nút
function fieldOf(text) {
  if (/^Email (này|không hợp lệ)/.test(text)) return 'email';
  if (/^Số điện thoại/.test(text)) return 'phone';
  if (/^Mật khẩu/.test(text)) return 'pw';
  return null;
}

// Lỗi riêng của một ô, đặt ngay dưới ô; id dùng cho aria-describedby
function FieldErr({ id, text }) {
  return text ? <p className="field-err" id={id + '-err'}>{text}</p> : null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState('seeker');
  const [msg, setMsg] = useState(null);
  const [errs, setErrs] = useState({});
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
    setResend(null); setMsg(null);
    // Kiểm tra từng ô, lỗi hiện ngay dưới ô sai và giữ nguyên tới lần gửi sau
    const e2 = {};
    if (!name) e2.name = 'Vui lòng nhập họ và tên';
    if (!phone) e2.phone = 'Vui lòng nhập số điện thoại';
    else if (!/^0\d{9}$/.test(phone)) e2.phone = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0';
    if (!email) e2.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e2.email = 'Email không hợp lệ';
    if (!pw) e2.pw = 'Vui lòng nhập mật khẩu';
    else if (pwError(pw)) e2.pw = pwError(pw);
    if (!pw2) e2.pw2 = 'Vui lòng nhập lại mật khẩu';
    else if (!e2.pw && pw !== pw2) e2.pw2 = 'Mật khẩu nhập lại không khớp';
    setErrs(e2);
    const first = FIELDS.find((k) => e2[k]);
    if (first) { f[first].focus(); return; }
    setBusy(true);
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
    } catch (err) {
      setBusy(false);
      const text = translate(err.message);
      const k = fieldOf(text);
      if (!k) return setMsg({ text });
      setErrs({ [k]: text });
      f[k].focus();
    }
  }

  const inv = (k) => (errs[k] ? { 'aria-invalid': 'true', 'aria-describedby': k + '-err' } : {});

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
        <form className="form-card tw-self-center tw-max-w-[560px]" onSubmit={submit} noValidate>
          <div><h1>Tạo tài khoản</h1><p className="lead">Bước 1/2 · Thông tin đăng nhập</p></div>
          <fieldset><legend>Bạn là</legend>
            <div className="role-pick">
              <button type="button" aria-pressed={role === 'seeker'} onClick={() => setRole('seeker')}><IconUser /><strong className="tw-text-[16px]">Người tìm việc</strong><span>Tìm ca làm part-time</span></button>
              <button type="button" aria-pressed={role === 'employer'} className="dark" onClick={() => setRole('employer')}><IconShop /><strong className="tw-text-[16px]">Nhà tuyển dụng</strong><span>Đăng tin, duyệt ứng viên</span></button>
            </div></fieldset>
          <div className="field"><label htmlFor="name">Họ và tên</label><input id="name" name="name" type="text" placeholder="Nguyễn Văn A" {...inv('name')} /><FieldErr id="name" text={errs.name} /></div>
          <div className="cols">
            <div className="field"><label htmlFor="phone">Số điện thoại</label><input id="phone" name="phone" type="tel" placeholder="09xx xxx xxx" {...inv('phone')} /><FieldErr id="phone" text={errs.phone} /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" placeholder="ban@email.com" {...inv('email')} /><FieldErr id="email" text={errs.email} /></div>
            <div className="field"><label htmlFor="pw">Mật khẩu</label><PasswordInput id="pw" name="pw" meter placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" {...inv('pw')} /><FieldErr id="pw" text={errs.pw} /></div>
            <div className="field"><label htmlFor="pw2">Nhập lại mật khẩu</label><PasswordInput id="pw2" name="pw2" placeholder="••••••••" autoComplete="new-password" {...inv('pw2')} /><FieldErr id="pw2" text={errs.pw2} /></div>
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
