'use client';
// Nhà tuyển dụng: danh sách ứng viên tiềm năng. Ô tìm nằm ở thanh đầu trang (dùng chung qua Search).
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Avatar, { candidateName } from '@/components/Avatar';
import Page from '@/components/Page';
import { useSearch, useSearchHandlers } from '@/components/Search';
import { Badge, Empty } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { LANG, SLOT, WORKMODE } from '@/lib/format';

const MODES = [['online', 'Online'], ['offline', 'Offline'], ['both', 'Cả hai']];
const SLOTS = [['morning', 'Sáng'], ['afternoon', 'Chiều'], ['evening', 'Tối'], ['weekend', 'Cuối tuần']];
const AREAS = ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Liên Chiểu', 'Ngũ Hành Sơn'];
const NO_FILTER = { mode: '', slots: [], exp: '', area: '', lang: '', sort: 'updated' };
const age = (c) => (c.birth_year ? new Date().getFullYear() - c.birth_year : null);

function CandidateCard({ c }) {
  const meta = [WORKMODE[c.work_mode], c.area, age(c) ? age(c) + ' tuổi' : ''].filter(Boolean);
  const sl = (c.availability || []).map((a) => SLOT[a.slot] || a.slot);
  return (
    <article className="card">
      <div className="card-head"><Avatar c={c} />
        <div className="grow"><h3>{candidateName(c)}</h3><p>{meta.join(' · ')}</p></div>
        <Badge kind={c.has_experience ? 'ok' : ''}>{c.has_experience ? 'Có kinh nghiệm' : 'Chưa có kinh nghiệm'}</Badge></div>
      <dl className="facts"><dt>Ngoại ngữ</dt><dd>{LANG[c.language_level] || '—'}</dd><dt>Thời gian rảnh</dt><dd>{sl.join(', ') || '—'}</dd></dl>
      {c.availability_note ? <p className="desc">{c.availability_note}</p> : null}
      <Link className="btn push" href={'/candidates/' + encodeURIComponent(c.user_id)}>Xem hồ sơ</Link>
    </article>
  );
}

function Candidates() {
  const search = useSearch();
  const initialQ = useSearchParams().get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [filter, setFilter] = useState(NO_FILTER);
  const [state, setState] = useState({ loading: true, rows: [], error: null });
  const [tick, setTick] = useState(0); // tăng để tải lại ngay (Enter / nút Tìm)
  const timer = useRef(null);
  const set = (k, v) => setFilter((x) => ({ ...x, [k]: v }));

  // đưa từ khóa từ ?q= vào ô tìm ở đầu trang
  useEffect(() => { search.setValue(initialQ); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // gõ chữ: chờ 250ms rồi mới tìm (qua q); Enter/nút Tìm: tìm ngay
  useSearchHandlers({
    onInput: (text) => { clearTimeout(timer.current); timer.current = setTimeout(() => setQ(text), 250); },
    onSubmit: (text) => { clearTimeout(timer.current); setQ(text); setTick((t) => t + 1); },
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    let dead = false;
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (filter.mode) p.set('work_mode', filter.mode);
    if (filter.slots.length) p.set('slots', filter.slots.join(','));
    if (filter.exp) p.set('has_experience', filter.exp);
    if (filter.area) p.set('area', filter.area);
    if (filter.lang === '0') p.set('language_level', '0');
    else if (filter.lang !== '') p.set('min_lang', filter.lang);
    p.set('sort', filter.sort);
    setState((s) => ({ ...s, loading: true }));
    Auth.call('GET', '/api/seekers?' + p.toString())
      .then((rows) => { if (!dead) setState({ loading: false, rows, error: null }); })
      .catch((e) => { if (!dead) setState({ loading: false, rows: [], error: e.message }); });
    return () => { dead = true; };
  }, [q, filter, tick]);

  const { loading, rows, error } = state;
  const count = loading ? 'Đang tìm…' : error ? '' : rows.length + ' ứng viên' + (rows.length === 50 ? ' (tối đa 50 kết quả, hãy thêm từ khóa/bộ lọc)' : '');

  return (
    <main className="stack">
      <h1 className="sr-only">Tìm ứng viên</h1>
      <section className="panel" aria-labelledby="flt">
        <div className="row between"><h2 id="flt">Lọc và sắp xếp ứng viên</h2>
          <button type="button" className="btn btn-sm" onClick={() => { setFilter(NO_FILTER); search.setValue(''); setQ(''); }}>Xóa bộ lọc</button></div>
        <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', alignItems: 'end' }}>
          <fieldset><legend>Hình thức muốn làm</legend>
            <div className="chips">{MODES.map(([v, t]) => <button key={v} type="button" className="chip" aria-pressed={filter.mode === v} onClick={() => set('mode', filter.mode === v ? '' : v)}>{t}</button>)}</div></fieldset>
          <fieldset><legend>Thời gian rảnh (chọn nhiều)</legend>
            <div className="chips">{SLOTS.map(([v, t]) => (
              <button key={v} type="button" className="chip" aria-pressed={filter.slots.includes(v)}
                onClick={() => set('slots', filter.slots.includes(v) ? filter.slots.filter((x) => x !== v) : filter.slots.concat(v))}>{t}</button>
            ))}</div></fieldset>
          <div className="field"><label htmlFor="fexp">Kinh nghiệm</label>
            <select id="fexp" value={filter.exp} onChange={(e) => set('exp', e.target.value)}><option value="">Tất cả</option><option value="true">Đã có kinh nghiệm</option><option value="false">Chưa có kinh nghiệm</option></select></div>
          <div className="field"><label htmlFor="farea">Khu vực (nơi cư trú)</label>
            <select id="farea" value={filter.area} onChange={(e) => set('area', e.target.value)}><option value="">Tất cả khu vực</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="field"><label htmlFor="flang">Trình độ ngoại ngữ</label>
            <select id="flang" value={filter.lang} onChange={(e) => set('lang', e.target.value)}><option value="">Không yêu cầu</option><option value="0">Chưa có</option><option value="1">Từ giao tiếp cơ bản</option><option value="2">Từ khá</option><option value="3">Tốt</option></select></div>
          <div className="field"><label htmlFor="fsort">Sắp xếp</label>
            <select id="fsort" value={filter.sort} onChange={(e) => set('sort', e.target.value)}><option value="updated">Mới cập nhật hồ sơ</option><option value="experience">Có kinh nghiệm trước</option><option value="age">Tuổi tăng dần</option></select></div>
        </div>
      </section>
      <div className="title-row"><h2 className="tw-m-0 tw-text-[24px] tw-font-bold tw-tracking-[-.01em]">Những ứng viên tiềm năng</h2><span className="muted small" aria-live="polite">{count}</span></div>
      <div aria-busy={loading}>
        {loading ? <p className="muted" role="status">Đang tìm ứng viên…</p>
          : error ? <p className="msg err" role="alert">Không tải được danh sách ứng viên: {error}</p>
            : rows.length ? <div className="grid-cards">{rows.map((c) => <CandidateCard key={c.user_id} c={c} />)}</div>
              : <Empty title="Không có ứng viên phù hợp" sub="Thử đổi từ khóa hoặc bỏ bớt bộ lọc." />}
      </div>
    </main>
  );
}

export default function CandidatesPage() {
  return (
    <Page layout="employer" active="candidates">
      <Suspense fallback={null}><Candidates /></Suspense>
    </Page>
  );
}
