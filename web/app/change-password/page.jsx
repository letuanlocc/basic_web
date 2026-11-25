'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Page from '@/components/Page';
import { Msg, PasswordInput } from '@/components/AuthParts';
import { Auth, pwError, translate } from '@/lib/auth';

// Mỗi form có thông báo + trạng thái bận riêng
function useAccountForm(router, run) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    setMsg(null);
    const err = run.validate(f);
    if (err) return setMsg({ text: err });
    setBusy(true);
    try {
      await run.call(f);
      run.done(f, setMsg, router);
    } catch (ex) { setBusy(false); setMsg({ text: translate(ex.message) }); }
  };
  return { msg, busy, submit };
}

// Các thay đổi tài khoản khiến phiên cũ không còn đúng → đăng xuất và đăng nhập lại
const relogin = (text) => (f, setMsg, router) => {
  Auth.clear(); f.reset();
  setMsg({ text: text + ' Đang chuyển đến trang đăng nhập…', kind: 'ok' });
  setTimeout(() => router.push('/login'), 1500);
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [back, setBack] = useState('/jobs');
  useEffect(() => {
    const s = Auth.get();
    if (s) setBack(Auth.role(s.user) === 'employer' ? '/shop' : '/profile');
  }, []);

  const pass = useAccountForm(router, {
    validate: (f) => {
      if (!f.cur.value || !f.pw.value) return 'Vui lòng điền đủ các ô';
      if (pwError(f.pw.value)) return pwError(f.pw.value);
      if (f.pw.value !== f.pw2.value) return 'Mật khẩu nhập lại không khớp';
      return '';
    },
    call: (f) => Auth.call('POST', '/api/auth/change-password', { current_password: f.cur.value, new_password: f.pw.value }),
    done: relogin('Đã đổi mật khẩu thành công.'),
  });
  const mail = useAccountForm(router, {
    validate: (f) => (!f.newmail.value.trim() || !f.pwe.value ? 'Vui lòng điền đủ các ô' : ''),
    call: (f) => Auth.call('POST', '/api/auth/change-email', { new_email: f.newmail.value.trim(), password: f.pwe.value }),
    done: relogin('Đã đổi email đăng nhập.'),
  });
  const del = useAccountForm(router, {
    validate: (f) => {
      if (!f.sure.checked) return 'Hãy tích vào ô xác nhận để tiếp tục';
      if (!f.pwd.value) return 'Vui lòng nhập mật khẩu để xác nhận';
      return '';
    },
    call: (f) => Auth.call('POST', '/api/auth/delete-account', { password: f.pwd.value }),
    done: () => { Auth.clear(); window.location.href = '/'; },
  });

  return (
    <Page layout="plain" require="any">
      <main className="stack-lg">
        <h1 style={{ alignSelf: 'center', margin: 0, fontSize: 28 }}>Tài khoản &amp; bảo mật</h1>

        <form className="form-card" style={{ alignSelf: 'center', maxWidth: 440, width: '100%' }} onSubmit={pass.submit}>
          <div><h2 style={{ margin: 0, fontSize: 20 }}>Đổi mật khẩu</h2><p className="lead">Nhập mật khẩu hiện tại và mật khẩu mới của bạn.</p></div>
          <div className="field"><label htmlFor="cur">Mật khẩu hiện tại</label><PasswordInput id="cur" name="cur" autoComplete="current-password" /></div>
          <div className="field"><label htmlFor="pw">Mật khẩu mới</label><PasswordInput id="pw" name="pw" meter placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" /></div>
          <div className="field"><label htmlFor="pw2">Nhập lại mật khẩu mới</label><PasswordInput id="pw2" name="pw2" autoComplete="new-password" /></div>
          <Msg msg={pass.msg} />
          <button type="submit" className="btn btn-primary btn-lg" disabled={pass.busy}>{pass.busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</button>
        </form>

        <form className="form-card" style={{ alignSelf: 'center', maxWidth: 440, width: '100%' }} onSubmit={mail.submit}>
          <div><h2 style={{ margin: 0, fontSize: 20 }}>Đổi email đăng nhập</h2><p className="lead">Dùng email mới từ lần đăng nhập sau.</p></div>
          <div className="field"><label htmlFor="newmail">Email mới</label><input id="newmail" name="newmail" type="email" placeholder="ban@email.com" autoComplete="email" /></div>
          <div className="field"><label htmlFor="pwe">Mật khẩu hiện tại</label><PasswordInput id="pwe" name="pwe" autoComplete="current-password" /></div>
          <Msg msg={mail.msg} />
          <button type="submit" className="btn btn-lg" disabled={mail.busy}>{mail.busy ? 'Đang lưu…' : 'Lưu email mới'}</button>
        </form>

        <form className="form-card" style={{ alignSelf: 'center', maxWidth: 440, width: '100%' }} onSubmit={del.submit}>
          <div><h2 style={{ margin: 0, fontSize: 20 }}>Xóa tài khoản</h2><p className="lead">Toàn bộ hồ sơ và dữ liệu của bạn sẽ bị xóa vĩnh viễn, không khôi phục được.</p></div>
          <div className="field"><label htmlFor="pwd">Mật khẩu hiện tại</label><PasswordInput id="pwd" name="pwd" autoComplete="current-password" /></div>
          <label className="remember"><input type="checkbox" id="sure" name="sure" /> Tôi hiểu tài khoản sẽ bị xóa vĩnh viễn</label>
          <Msg msg={del.msg} />
          <button type="submit" className="btn btn-danger btn-lg" disabled={del.busy}>{del.busy ? 'Đang xóa…' : 'Xóa tài khoản'}</button>
        </form>

        <p className="muted small" style={{ margin: 0, textAlign: 'center' }}><Link href={back} style={{ fontWeight: 700 }}>Quay lại hồ sơ</Link></p>
      </main>
    </Page>
  );
}
