'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Page from '@/components/Page';
import { Badge, Empty } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { LANG, STATUS, WORKMODE, dateVN, formatSalary, whenText } from '@/lib/format';

function AppRow({ a, onDecide, busy }) {
  const s = a.seeker || {}, u = s.user || {}, st = STATUS[a.status] || ['', a.status];
  const meta = [s.area, WORKMODE[s.work_mode], s.birth_year ? 'sinh ' + s.birth_year : '', s.language_level ? 'Ngoại ngữ: ' + LANG[s.language_level] : ''].filter(Boolean).join(' · ');
  return (
    <li className="row between" style={{ padding: '10px 0', borderTop: '1px solid var(--line-3)' }}>
      <div><strong>{u.full_name || 'Ứng viên'}</strong> <Badge kind={st[0]}>{st[1]}</Badge>
        {a.source === 'invited' ? <> <Badge>Được mời</Badge></> : null}<br /><span className="muted small">{meta}</span>
        {s.availability_note ? <><br /><span className="small">{s.availability_note}</span></> : null}</div>
      {a.status === 'pending' ? (
        <div className="row"><button type="button" className="btn" disabled={busy} onClick={() => onDecide(a.id, true)}>Nhận</button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => onDecide(a.id, false)}>Từ chối</button></div>
      ) : null}
    </li>
  );
}

// Hồ sơ ứng viên của một vị trí (mở/đóng ngay trong thẻ)
function Applications({ id, version, onDecide, busy }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let dead = false;
    Auth.call('GET', '/api/positions/' + id + '/applications').then((r) => { if (!dead) { setRows(r); setErr(null); } })
      .catch((e) => { if (!dead) setErr(e.message); });
    return () => { dead = true; };
  }, [id, version]);
  if (err) return <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}><li><p className="msg err">{err}</p></li></ul>;
  if (!rows) return <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}><li className="muted small">Đang tải…</li></ul>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.length ? rows.map((a) => <AppRow key={a.id} a={a} onDecide={onDecide} busy={busy} />)
        : <li className="muted small" style={{ paddingTop: 10 }}>Chưa có hồ sơ nào.</li>}
    </ul>
  );
}

export default function PositionsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({}); // id → true: đang mở danh sách hồ sơ
  const [version, setVersion] = useState(0); // tăng để tải lại hồ sơ đang mở
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await Auth.call('GET', '/api/me/shop/positions')); setVersion((v) => v + 1); setError(null); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(fn) {
    setBusy(true);
    try { await fn(); await load(); } catch (er) { window.alert(er.message); }
    setBusy(false);
  }

  let body;
  if (error) body = <Empty title="Không tải được danh sách" sub={error} />;
  else if (!rows) body = <p className="muted">Đang tải…</p>;
  else if (!rows.length) body = <Empty title="Chưa có vị trí nào" sub={'Bấm "+ Đăng tin tuyển" để tạo vị trí đầu tiên.'} />;
  else {
    body = (
      <div className="stack-col" style={{ gap: 16 }}>
        {rows.map((p) => (
          <article className="card" key={p.id}>
            <div className="card-head"><div className="grow"><h3>{p.title}</h3><p>{whenText(p)}</p></div>
              <Badge kind={p.is_open ? 'ok' : ''}>{p.is_open ? 'Đang tuyển' : 'Đã đóng'}</Badge></div>
            <dl className="facts"><dt>Lương</dt><dd className="b">{formatSalary(p)}</dd><dt>Đã nhận</dt><dd>{p.filled}/{p.headcount} người</dd>
              <dt>Hồ sơ chờ</dt><dd>{p.pending}</dd><dt>Hạn ứng tuyển</dt><dd>{dateVN(p.deadline)}</dd></dl>
            <div className="row">
              <button type="button" className="btn" onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}>Hồ sơ ứng viên</button>
              <Link className="btn" href={'/new-post?edit=' + encodeURIComponent(p.id)}>Sửa tin</Link>
              <button type="button" className="btn" disabled={busy} onClick={() => run(() => Auth.call('POST', '/api/positions/' + p.id + '/' + (p.is_open ? 'close' : 'open')))}>{p.is_open ? 'Đóng tin' : 'Mở lại tin'}</button>
            </div>
            {open[p.id] ? <Applications id={p.id} version={version} busy={busy}
              onDecide={(appId, accept) => run(() => Auth.call('POST', '/api/applications/' + appId + '/decision', { accept }))} /> : null}
          </article>
        ))}
      </div>
    );
  }

  return (
    <Page layout="employer" active="positions">
      <main className="stack">
        <div><h1 style={{ margin: '0 0 4px', fontSize: 24 }}>Vị trí &amp; tuyển dụng</h1><p className="muted small" style={{ margin: 0 }}>{rows ? rows.length + ' vị trí' : ''}</p></div>
        <div>{body}</div>
      </main>
    </Page>
  );
}
