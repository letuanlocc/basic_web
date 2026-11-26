'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDialog } from '@/components/Dialog';
import Page from '@/components/Page';
import { Badge, Empty, Notice, ShopPhotos } from '@/components/ui';
import { Auth, pub } from '@/lib/auth';
import { STATUS, dateVN, formatSalary, hh, workDays } from '@/lib/format';

function Items({ title, items }) {
  if (!items.length) return null;
  return <div><h3>{title}</h3><ul>{items.map((i, k) => <li key={k}>{i.content}</li>)}</ul></div>;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null); // { p, apps, saved, emp }
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');
  const [contact, setContact] = useState(null);
  const dlg = useDialog();

  const load = useCallback(async () => {
    try {
      // Khách xem được tin tuyển; ứng tuyển, lưu việc, SĐT liên hệ vẫn cần đăng nhập
      if (!Auth.get()) { setData({ p: await pub('/api/positions/' + id), apps: [], saved: [], emp: null, guest: true }); return; }
      const [p, apps, saved, emp] = await Promise.all([
        Auth.call('GET', '/api/positions/' + id),
        Auth.call('GET', '/api/applications/mine').catch(() => []),
        Auth.call('GET', '/api/me/saved').catch(() => []),
        // việc đang làm thật (đơn "accepted" vẫn còn sau khi bị chủ quán xóa khỏi danh sách)
        Auth.call('GET', '/api/employments/mine').catch(() => null),
      ]);
      setData({ p, apps, saved, emp });
    } catch (e) { setError(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const p = data && data.p;
  const mine = data && data.apps.find((a) => a.position && a.position.id === p.id && (a.status === 'pending' || a.status === 'accepted'));
  useEffect(() => {
    if (!mine) { setContact(null); return; }
    Auth.call('GET', '/api/positions/' + id + '/contact').then((c) => { if (c) setContact(c); }).catch(() => {});
  }, [mine && mine.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(name, fn) {
    if (data && data.guest) {
      dlg.needLogin('Đăng nhập để tiếp tục', 'Bạn cần có tài khoản để ứng tuyển, lưu việc và đăng ký lịch làm.');
      return;
    }
    setBusy(name); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ text: e.message }); }
    setBusy('');
  }

  let body;
  if (error) body = <Empty title="Không tải được công việc" sub={error} />;
  else if (!data) body = <p className="muted">Đang tải…</p>;
  else {
    const isSaved = data.saved.some((s) => s.position && s.position.id === p.id);
    const kinds = (k) => (p.items || []).filter((i) => i.kind === k);
    const shop = p.shop || {};
    const closed = !p.is_open || (p.deadline && p.deadline < new Date().toISOString().slice(0, 10));
    const full = p.filled >= p.headcount;
    const ended = mine && mine.status === 'accepted' && data.emp && data.emp.map((e) => String(e.position.id)).indexOf(String(p.id)) < 0;

    let action;
    if (ended) {
      action = (<>
        <Badge>Đã nghỉ việc</Badge>
        <p className="muted small" style={{ margin: '8px 0 0' }}>Chủ quán đã xóa bạn khỏi danh sách nhân viên của vị trí này nên bạn không thể đăng ký lịch làm. Nếu chủ quán mời lại, lời mời sẽ có ở mục &quot;Lời mời&quot; trong Công việc của tôi.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" disabled={busy === 'dismiss'} onClick={() => {
            if (!window.confirm('Xóa việc đã nghỉ này khỏi danh sách? Bạn vẫn có thể ứng tuyển lại sau.')) return;
            run('dismiss', async () => { await Auth.call('POST', '/api/applications/' + mine.id + '/dismiss'); await load(); });
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
          onClick={() => run('apply', async () => { await Auth.call('POST', '/api/positions/' + p.id + '/apply'); await load(); })}>
          {busy === 'apply' ? 'Đang gửi…' : 'Ứng tuyển ngay'}
        </button>
      );
    }

    body = (
      <>
        <div className="title-row"><h1>{p.title}</h1></div>
        <div className="two-col">
          <div className="stack-col" style={{ gap: 16 }}>
            <section className="sect"><h2>Thông tin chung</h2>
              <div className="badges">
                <Badge kind={p.mode === 'online' ? '' : 'ok'}>{p.mode === 'online' ? 'Online' : 'Offline'}</Badge>
                {p.no_experience ? <Badge>Không cần kinh nghiệm</Badge> : null}
                {p.accepts_intern ? <Badge>Nhận thực tập</Badge> : null}
              </div>
              {p.summary ? <p style={{ margin: 0 }}>{p.summary}</p> : null}
              <dl className="facts"><dt>Địa điểm</dt><dd>{p.address || '—'}</dd><dt>Cách làm việc</dt><dd>{p.work_form || '—'}</dd>
                <dt>Ngày bắt đầu</dt><dd>{dateVN(p.start_date)}</dd></dl></section>
            <section className="sect"><h2>Mô tả công việc</h2>
              <Items title="Nhiệm vụ chính" items={kinds('task')} /><Items title="Yêu cầu ứng viên" items={kinds('requirement')} /><Items title="Quyền lợi" items={kinds('perk')} /></section>
            <section className="sect"><h2>Lịch làm việc</h2>
              <dl className="facts"><dt>Ngày làm</dt><dd>{workDays(p) || '—'}</dd>
                <dt>Giờ mở cửa</dt><dd>{p.open_hour != null ? hh(p.open_hour) + ' – ' + hh(p.close_hour) : '—'}</dd>
                <dt>Ca làm</dt><dd>{(p.shifts || []).length ? p.shifts.map((s, i) => <span key={i}>{i ? <br /> : null}{s.name} ({hh(s.start_hour)}–{hh(s.end_hour)})</span>) : '—'}</dd>
                {p.min_week_hours != null || p.max_week_hours != null ? <><dt>Giờ/tuần</dt><dd>{p.min_week_hours || 0} – {p.max_week_hours || '…'} giờ</dd></> : null}
                {p.max_day_hours != null ? <><dt>Tối đa/ngày</dt><dd>{p.max_day_hours} giờ</dd></> : null}</dl></section>
            <section className="sect"><h2>Thông tin nhà tuyển dụng</h2>
              <dl className="facts"><dt>Tên</dt><dd className="b">{shop.name || p.shop_name}</dd>
                <dt>Địa chỉ</dt><dd>{[shop.address, shop.ward, shop.city].filter(Boolean).join(', ') || '—'}</dd>
                {shop.phone ? <><dt>SĐT cửa hàng</dt><dd>{shop.phone}</dd></> : null}
                {shop.fanpage_url ? <><dt>Website</dt><dd>{shop.fanpage_url}</dd></> : null}</dl>
              <ShopPhotos shop={shop} />
              <div>{contact && <p className="msg info" style={{ margin: 0 }}>Người liên hệ phỏng vấn: <strong>{contact.contact_name}</strong> · {contact.contact_phone}</p>}</div></section>
          </div>
          <aside className="panel" aria-label="Ứng tuyển">
            <div className="b" style={{ fontSize: 22, fontWeight: 700 }}>{formatSalary(p)}</div>
            <dl className="facts"><dt>Hạn ứng tuyển</dt><dd>{dateVN(p.deadline)}</dd><dt>Đã nhận</dt><dd>{p.filled}/{p.headcount} người</dd></dl>
            <Notice msg={msg} />
            {action}
            <button type="button" className="btn" aria-pressed={isSaved} disabled={busy === 'save'}
              onClick={() => run('save', async () => { await Auth.call(isSaved ? 'DELETE' : 'PUT', '/api/me/saved/' + p.id); await load(); })}>
              {isSaved ? 'Bỏ lưu việc' : 'Lưu việc'}
            </button>
          </aside>
        </div>
      </>
    );
  }

  return (
    <Page layout="seeker" active="home" isPublic>
      <main className="stack">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/jobs">Trang chủ</Link> → <span>Chi tiết công việc</span></nav>
        <div>{body}</div>
        <Link className="btn" style={{ alignSelf: 'center' }} href="/jobs">Về trang chủ</Link>
      </main>
    </Page>
  );
}
