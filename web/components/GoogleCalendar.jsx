'use client';
// Khối "Google Calendar" trên trang đăng ký lịch: kết nối / ngắt kết nối, công tắc tự cập nhật, trạng thái bằng chữ.
// Luồng OAuth dùng redirect (không popup). Token ở phía server, trình duyệt chỉ nhận trạng thái.
// savedRef: trang gán .current = hàm gọi sau khi lưu lịch để theo dõi đồng bộ sát hơn trong vài giây.
import { useEffect, useRef, useState } from 'react';
import { Auth } from '@/lib/auth';

const FEEDBACK = {
  cancelled: 'Bạn đã hủy cấp quyền Google Calendar.',
  expired: 'Phiên kết nối Google đã hết hạn. Hãy thử kết nối lại.',
  error: 'Kết nối Google Calendar không thành công. Hãy kiểm tra tài khoản Google rồi thử lại.',
};

export default function GoogleCalendar({ savedRef }) {
  const [current, setCurrent] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState('');
  const connectBtn = useRef(null);
  const timer = useRef(null);
  const request = useRef(0);
  const watchUntil = useRef(0);
  const changingRef = useRef(false);
  const currentRef = useRef(null);
  const fns = useRef({});

  const apply = (data) => { currentRef.current = data; setCurrent(data); };

  fns.current.scheduleRefresh = () => {
    clearTimeout(timer.current);
    const c = currentRef.current;
    if (changingRef.current || document.hidden) return;
    if (!c || (c.available && c.status === 'active')) {
      const quick = (c && c.sync_status === 'syncing') || Date.now() < watchUntil.current;
      timer.current = setTimeout(() => fns.current.refresh(), quick ? 1400 : 15000);
    }
  };
  fns.current.refresh = () => {
    clearTimeout(timer.current);
    if (changingRef.current || document.hidden) return;
    const id = ++request.current;
    Auth.call('GET', '/api/google/status').then((data) => {
      if (id !== request.current) return;
      setLoadError(false); apply(data); fns.current.scheduleRefresh();
    }).catch(() => {
      if (id !== request.current) return;
      if (!currentRef.current) setLoadError(true);
      fns.current.scheduleRefresh();
    });
  };

  async function change(action, done) {
    ++request.current; clearTimeout(timer.current);
    changingRef.current = true; setChanging(true); setMessage('');
    try {
      const data = await action();
      if (done) done(data); else if (data) apply(data);
    } catch (error) { setMessage(error.message); }
    changingRef.current = false; setChanging(false);
    fns.current.scheduleRefresh();
  }

  useEffect(() => {
    // Quay về từ Google: báo kết quả rồi xóa tham số khỏi địa chỉ
    const landing = new URL(window.location.href);
    const result = landing.searchParams.get('google');
    if (result) {
      if (Object.hasOwn(FEEDBACK, result)) setMessage(FEEDBACK[result]);
      landing.searchParams.delete('google');
      window.history.replaceState(window.history.state, '', landing.pathname + landing.search + landing.hash);
    }
    const onVisible = () => fns.current.refresh();
    document.addEventListener('visibilitychange', onVisible);
    fns.current.refresh();
    if (savedRef) savedRef.current = () => { watchUntil.current = Date.now() + 6000; fns.current.refresh(); };
    return () => { document.removeEventListener('visibilitychange', onVisible); clearTimeout(timer.current); if (savedRef) savedRef.current = null; };
  }, [savedRef]);

  const available = !!(current && current.available);
  const connected = available && current.status === 'active';
  const revoked = available && current.status === 'revoked';
  let label, tone = '';
  if (loadError && !current) { label = 'Không tải được trạng thái'; tone = 'err'; }
  else if (!current) label = 'Đang tải…';
  else if (!available) label = 'Chưa được cấu hình';
  else if (revoked) { label = 'Cần kết nối lại'; tone = 'err'; }
  else if (!connected) label = 'Chưa kết nối';
  else if (current.sync_status === 'syncing') { label = 'Đang đồng bộ'; tone = 'warn'; }
  else if (current.sync_status === 'error') { label = 'Đồng bộ lỗi'; tone = 'err'; }
  else { label = 'Đã kết nối'; tone = 'ok'; }

  return (
    <section className="card" id="google-calendar" aria-labelledby="google-calendar-title">
      <div className="row between">
        <div className="row">
          <strong id="google-calendar-title">Google Calendar</strong>
          <span className={('badge ' + tone).trim()} role="status" aria-atomic="true">{label}</span>
        </div>
        <div className="row">
          <button type="button" className="btn" ref={connectBtn} hidden={!available || connected} disabled={changing}
            onClick={() => change(() => Auth.call('GET', '/api/google/connect'), (data) => window.location.assign(data.url))}>
            {revoked ? 'Kết nối lại' : 'Kết nối Google Calendar'}
          </button>
          <button type="button" className="btn" hidden={!connected && !revoked} disabled={changing}
            onClick={() => change(() => Auth.call('DELETE', '/api/google/disconnect'), (data) => { apply(data); setTimeout(() => connectBtn.current && connectBtn.current.focus(), 0); })}>
            Ngắt kết nối
          </button>
        </div>
      </div>
      <div hidden={!connected}>
        <label className="row">
          <input type="checkbox" checked={Boolean(current && current.auto_sync_manager_changes)} disabled={changing}
            onChange={(e) => change(() => Auth.call('PUT', '/api/google/settings', { auto_sync_manager_changes: e.target.checked }))} />
          Tự cập nhật khi chủ quán thay đổi lịch
        </label>
      </div>
      {message ? <p className="msg err" role="alert">{message}</p> : null}
    </section>
  );
}
