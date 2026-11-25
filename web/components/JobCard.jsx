'use client';
// Thẻ việc. Thứ tự thông tin cố định: ai tuyển → hình thức → lương, thời gian, địa điểm → mô tả ngắn → hành động.
import Link from 'next/link';
import { formatSalary, whenText } from '@/lib/format';
import { Badge } from './ui';

export default function JobCard({ p, loggedIn, onGate, preview }) {
  const link = preview
    ? <span className="btn push" aria-hidden="true">Xem chi tiết</span>
    : loggedIn
    ? <Link className="btn push" href={'/jobs/' + encodeURIComponent(p.id)}>Xem chi tiết</Link>
    : <button type="button" className="btn push" onClick={onGate}>Xem chi tiết</button>;
  return (
    <article className="card">
      <div className="card-head">
        <span className="initial" aria-hidden="true">{(p.shop_name || '?').trim().charAt(0).toUpperCase()}</span>
        <div className="grow"><h3>{p.title}</h3><p>{p.shop_name}</p></div>
        <Badge kind={p.mode === 'online' ? '' : 'ok'}>{p.mode === 'online' ? 'Online' : 'Offline'}</Badge>
      </div>
      <dl className="facts">
        <dt>Lương</dt><dd className="b">{formatSalary(p)}</dd>
        <dt>Thời gian</dt><dd>{whenText(p)}</dd>
        <dt>Địa điểm</dt><dd>{p.address || '—'}</dd>
      </dl>
      {p.summary ? <p className="desc">{p.summary}</p> : null}
      {link}
    </article>
  );
}
