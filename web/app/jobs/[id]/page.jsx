// Server Component: đọc chi tiết tin tuyển trên máy chủ (Supabase) và dựng sẵn nội dung.
// Phần ứng tuyển / lưu việc / người liên hệ cần biết ai đang xem nên nằm ở JobPanel (client).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import Page from '@/components/Page';
import { Badge, Empty, ShopPhotos } from '@/components/ui';
import { dateVN, hh, workDays } from '@/lib/format';
import { positionDetail } from '@/lib/positions-server';
import JobPanel from './JobPanel';

// Luôn đọc mới: số người đã nhận, trạng thái đóng/mở thay đổi theo từng lượt ứng tuyển
export const dynamic = 'force-dynamic';

// generateMetadata và trang dùng chung một lần đọc
const load = cache((id) => positionDetail(id));

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await load(id);
  if (!p || p === 'missing') return { title: 'Chi tiết công việc · CaRảnh' };
  return {
    title: p.title + ' · ' + p.shop_name + ' · CaRảnh',
    description: p.summary || 'Chi tiết tin tuyển part-time trên CaRảnh.',
  };
}

function Items({ title, items }) {
  if (!items.length) return null;
  return <div><h3>{title}</h3><ul>{items.map((i, k) => <li key={k}>{i.content}</li>)}</ul></div>;
}

export default async function JobDetailPage({ params }) {
  const { id } = await params;
  const p = await load(id);
  if (p === 'missing') notFound();

  let body;
  if (!p) body = <Empty title="Không tải được công việc" sub="Vui lòng tải lại trang sau ít phút." />;
  else {
    const kinds = (k) => (p.items || []).filter((i) => i.kind === k);
    const shop = p.shop || {};
    body = (
      <>
        <div className="title-row"><h1>{p.title}</h1></div>
        <JobPanel initial={p}>
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
            <ShopPhotos shop={shop} /></section>
        </JobPanel>
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
