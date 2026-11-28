'use client';
// Phần tương tác của trang chi tiết việc: ứng tuyển, lưu việc, người liên hệ phỏng vấn.
// Nội dung tin (children) đã được máy chủ đọc và dựng sẵn; ở đây chỉ tải trạng thái riêng của người đang xem.
import { useCallback, useEffect, useState } from 'react';
import { useDialog } from '@/components/Dialog';
import { Badge, Notice } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { STATUS, dateVN, formatSalary } from '@/lib/format';

export default function JobPanel({ initial, children }) {
  const dlg = useDialog();
  const id = initial.id;
  const [p, setP] = useState(initial);
  const [me, setMe] = useState(null); // { apps, saved, emp } của người đã đăng nhập; khách: { guest: true }
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');
  const [contact, setContact] = useState(null);

  // refresh = true: đọc lại cả tin (số người đã nhận đổi sau khi ứng tuyển)
  const load = useCallback(async (refresh) => {
    if (!Auth.get()) { setMe({ guest: true }); return; }
    const [fresh, apps, saved, emp] = await Promise.all([
      refresh ? Auth.call('GET', '/api/positions/' + id) : null,
      Auth.call('GET', '/api/applications/mine').catch(() => []),
      Auth.call('GET', '/api/me/saved').catch(() => []),
      // việc đang làm thật (đơn "accepted" vẫn còn sau khi bị chủ quán xóa khỏi danh sách)
      Auth.call('GET', '/api/employments/mine').catch(() => null),
    ]);
    if (fresh) setP(fresh);
    setMe({ apps, saved, emp });
  }, [id]);
  useEffect(() => { load(false).catch((e) => setMsg({ text: e.message })); }, [load]);

  const mine = me && !me.guest && me.apps.find((a) => a.position && a.position.id === p.id && (a.status === 'pending' || a.status === 'accepted'));
  useEffect(() => {
    if (!mine) { setContact(null); return; }
    Auth.call('GET', '/api/positions/' + id + '/contact').then((c) => { if (c) setContact(c); }).catch(() => {});
  }, [mine && mine.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(name, fn) {
    if (me && me.guest) {
      dlg.needLogin('Đăng nhập để tiếp tục', 'Bạn cần có tài khoản để ứng tuyển, lưu việc và đăng ký lịch làm.');
      return;
    }
    setBusy(name); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ text: e.message }); }
    setBusy('');
  }

  const isSaved = !!me && !me.guest && me.saved.some((s) => s.position && s.position.id === p.id);
  const closed = !p.is_open || (p.deadline && p.deadline < new Date().toISOString().slice(0, 10));
  const full = p.filled >= p.headcount;
  const ended = mine && mine.status === 'accepted' && me.emp && me.emp.map((e) => String(e.position.id)).indexOf(String(p.id)) < 0;

  let action;
  if (!me) action = null; // đang tải trạng thái của người xem
  else if (ended) {
    action = (<>
      <Badge>Đã nghỉ việc</Badge>
      <p className="muted small tw-mx-0 tw-mb-0 tw-mt-2">Chủ quán đã xóa bạn khỏi danh sách nhân viên của vị trí này nên bạn không thể đăng ký lịch làm. Nếu chủ quán mời lại, lời mời sẽ có ở mục &quot;Lời mời&quot; trong Công việc của tôi.</p>
      <div className="row tw-mt-3">
        <button type="button" className="btn" disabled={busy === 'dismiss'} onClick={() => {
          if (!window.confirm('Xóa việc đã nghỉ này khỏi danh sách? Bạn vẫn có thể ứng tuyển lại sau.')) return;
          run('dismiss', async () => { await Auth.call('POST', '/api/applications/' + mine.id + '/dismiss'); await load(true); });
        }}>Xóa khỏi danh sách</button>
      </div>
    </>);
  } else if (mine) action = <Badge kind={STATUS[mine.status][0]}>Bạn {mine.status === 'accepted' ? 'đã được nhận' : 'đã ứng tuyển · đang chờ phản hồi'}</Badge>;
  else if (closed) action = <Badge kind="err">Đã đóng tuyển</Badge>;
  else if (full) action = <Badge kind="warn">Đã đủ người</Badge>;
  else if (p.accepting === false) action = <Badge kind="warn">Hiện chưa nhận thêm hồ sơ</Badge>;
  else {
    action = (
      <button type="button" className="btn btn-primary btn-lg" disabled={busy === 'apply'}
        onClick={() => run('apply', async () => { await Auth.call('POST', '/api/positions/' + p.id + '/apply'); await load(true); })}>
        {busy === 'apply' ? 'Đang gửi…' : 'Ứng tuyển ngay'}
      </button>
    );
  }

  return (
    <div className="tw-grid tw-grid-cols-[minmax(0,1fr)_340px] tw-items-start tw-gap-5 [@media(max-width:900px)]:tw-grid-cols-1">
      <div className="tw-flex tw-flex-col tw-gap-4">
        {children}
        {contact && <p className="msg info tw-m-0">Người liên hệ phỏng vấn: <strong>{contact.contact_name}</strong> · {contact.contact_phone}</p>}
      </div>
      <aside className="tw-flex tw-flex-col tw-gap-3.5 tw-rounded-lg tw-border tw-border-solid tw-border-line tw-bg-white tw-p-5" aria-label="Ứng tuyển">
        <div className="tw-text-[22px] tw-font-bold">{formatSalary(p)}</div>
        <dl className="facts"><dt>Hạn ứng tuyển</dt><dd>{dateVN(p.deadline)}</dd><dt>Đã nhận</dt><dd>{p.filled}/{p.headcount} người</dd></dl>
        <Notice msg={msg} />
        {action}
        <button type="button" className="btn" aria-pressed={isSaved} disabled={!me || busy === 'save'}
          onClick={() => run('save', async () => { await Auth.call(isSaved ? 'DELETE' : 'PUT', '/api/me/saved/' + p.id); await load(false); })}>
          {isSaved ? 'Bỏ lưu việc' : 'Lưu việc'}
        </button>
      </aside>
    </div>
  );
}
