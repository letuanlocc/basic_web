'use client';
// Người tìm việc: đăng ký ca làm theo tuần (+ báo bận + đồng bộ Google Calendar)
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import GoogleCalendar from '@/components/GoogleCalendar';
import Page from '@/components/Page';
import ScheduleGrid from '@/components/ScheduleGrid';
import { Empty } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { DAY_LONG, dm, weekStart } from '@/lib/format';

const keyOf = (c) => c.shift_id + ':' + c.weekday;

// Cảnh báo/lỗi về số giờ: tối đa mỗi ngày, tối đa và tối thiểu mỗi tuần
function hoursNotice(hours, position, hasSelection, cells, sel) {
  if (!hasSelection) return null;
  if (position.max_day_hours != null) {
    const perDay = {};
    cells.forEach((c) => { if (sel[keyOf(c)]) perDay[c.weekday] = (perDay[c.weekday] || 0) + c.end_hour - c.start_hour; });
    for (const wd of Object.keys(perDay)) {
      if (perDay[wd] > Number(position.max_day_hours)) {
        return { kind: 'err', text: 'Bạn đã chọn ' + perDay[wd] + ' giờ trong ' + DAY_LONG[wd] + ', vượt quá số giờ tối đa mỗi ngày (' + position.max_day_hours + ' giờ). Hãy bỏ bớt ca trong ngày này.' };
      }
    }
  }
  if (position.max_week_hours != null && hours > Number(position.max_week_hours)) {
    return { kind: 'err', text: 'Bạn đang chọn ' + hours + ' giờ/tuần, vượt mức tối đa ' + position.max_week_hours + ' giờ. Hãy bỏ chọn ca để giảm tổng giờ trước khi lưu.' };
  }
  if (position.min_week_hours != null && hours < Number(position.min_week_hours)) {
    return { kind: 'warn', text: 'Bạn đang chọn ' + hours + ' giờ/tuần, thấp hơn mức tối thiểu ' + position.min_week_hours + ' giờ. Đây là cảnh báo: bạn vẫn có thể lưu lịch, hoặc chọn thêm ca để đạt mức tối thiểu.' };
  }
  return null;
}

// Ô bận đã lưu của việc đang xem → busySel; phần còn lại (việc khác) là ô bị khóa
function busySelOf(cells, busy) {
  const mineShift = {}, out = {};
  cells.forEach((c) => { mineShift[c.shift_id] = 1; });
  busy.forEach((b) => { if (b.own && mineShift[b.shift_id]) out[b.shift_id + ':' + b.weekday] = 1; });
  return out;
}

export default function SchedulePage() {
  const savedRef = useRef(null); // GoogleCalendar gán hàm theo dõi đồng bộ
  const reqId = useRef(0);
  const [jobs, setJobs] = useState(null);
  const [view, setView] = useState({ status: 'loading', text: '' }); // loading | empty | none | removed | error | ready
  const [posIdx, setPosIdx] = useState(0);
  const [week, setWeek] = useState(0); // 0 = tuần này, 1 = tuần sau
  const [cells, setCells] = useState([]);
  const [sel, setSel] = useState({});
  const [busy, setBusy] = useState([]);
  const [busySel, setBusySel] = useState({});
  const [mode, setMode] = useState('shift'); // 'shift' đăng ký ca | 'busy' tô ca bận
  const [smsg, setSmsg] = useState(null);
  const [saving, setSaving] = useState('');

  const job = jobs && jobs[posIdx];
  const ws = weekStart(week);

  // Danh sách việc đang làm
  useEffect(() => {
    Auth.call('GET', '/api/employments/mine').then((rows) => {
      if (!rows.length) { setView({ status: 'none' }); return; }
      const wanted = new URLSearchParams(window.location.search).get('position');
      const idx = rows.findIndex((r) => String(r.position.id) === wanted);
      setJobs(rows);
      // Liên kết trỏ tới một việc không còn hiệu lực (vd. chủ quán đã xóa khỏi danh sách nhân viên): báo rõ,
      // không lặng lẽ hiện lịch của việc khác để người dùng tưởng vẫn đăng ký được ở việc đó.
      if (wanted && idx < 0) { setView({ status: 'removed' }); return; }
      if (idx >= 0) setPosIdx(idx);
    }).catch((e) => setView({ status: 'error', text: e.message }));
  }, []);

  async function load(notice) {
    const id = ++reqId.current;
    setView({ status: 'loading' });
    try {
      const [rows, b] = await Promise.all([
        Auth.call('GET', '/api/positions/' + job.position.id + '/schedule?week_start=' + ws),
        Auth.call('GET', '/api/employments/' + job.id + '/busy?week_start=' + ws).catch(() => []),
      ]);
      if (id !== reqId.current) return;
      const s = {};
      rows.forEach((c) => { if (c.mine) s[keyOf(c)] = 1; });
      setCells(rows); setBusy(b || []); setSel(s); setMode('shift'); setBusySel(busySelOf(rows, b || []));
      setSmsg(notice ? { text: notice, kind: 'err' } : null);
      setView(rows.length ? { status: 'ready' } : { status: 'empty' });
    } catch (e) {
      if (id !== reqId.current) return;
      setView({ status: 'error', text: notice ? notice + ' Không tải lại được lịch: ' + e.message : e.message });
    }
  }
  useEffect(() => { if (job && view.status !== 'removed') load(); }, [job && job.id, week]); // eslint-disable-line react-hooks/exhaustive-deps

  const position = job && job.position;
  const selCount = Object.keys(sel).length;
  const hours = cells.reduce((h, c) => h + (sel[keyOf(c)] ? c.end_hour - c.start_hour : 0), 0);
  const notice = position ? hoursNotice(hours, position, selCount > 0, cells, sel) : null;
  const toggle = (k) => {
    const setter = mode === 'busy' ? setBusySel : setSel;
    setter((x) => { const n = { ...x }; if (n[k]) delete n[k]; else n[k] = 1; return n; });
  };
  const body = (src) => cells.filter((c) => src[keyOf(c)]).map((c) => ({ shift_id: c.shift_id, weekday: c.weekday }));

  async function saveBusy() {
    setSaving('busy'); setSmsg(null);
    try {
      await Auth.call('PUT', '/api/employments/' + job.id + '/busy', { week_start: ws, cells: body(busySel) });
      const b = (await Auth.call('GET', '/api/employments/' + job.id + '/busy?week_start=' + ws)) || [];
      setBusy(b); setBusySel(busySelOf(cells, b));
      setSmsg({ text: 'Đã lưu ca bận. Chủ quán sẽ không xếp bạn vào những ca này.', kind: '' });
    } catch (er) { setSmsg({ text: er.message, kind: 'err' }); }
    setSaving('');
  }

  async function saveShifts() {
    if (notice && notice.kind === 'err') { setSmsg({ text: notice.text, kind: 'err' }); return; }
    setSaving('shift'); setSmsg(null);
    try {
      const r = await Auth.call('PUT', '/api/employments/' + job.id + '/schedule', { week_start: ws, cells: body(sel) });
      if (savedRef.current) savedRef.current();
      const warn = r && r.below_min_week;
      const savedHours = r && r.total_hours != null ? r.total_hours : hours;
      const rows = await Auth.call('GET', '/api/positions/' + position.id + '/schedule?week_start=' + ws);
      const s = {};
      rows.forEach((c) => { if (c.mine) s[keyOf(c)] = 1; });
      const savedNotice = hoursNotice(savedHours, position, selCount > 0 || warn, rows, s);
      setCells(rows); setSel(s);
      setSmsg({
        kind: savedNotice ? savedNotice.kind : '',
        text: 'Đăng ký ca thành công. HR có thể xem lịch đã cập nhật trong mục Lịch làm.' + (savedHours != null ? ' Tổng ' + savedHours + ' giờ trong tuần.' : '') + (savedNotice ? ' ' + savedNotice.text : ''),
      });
    } catch (er) {
      if (/Ca này đã đủ người/.test(er.message)) {
        const wanted = Object.keys(sel);
        try {
          const rows = await Auth.call('GET', '/api/positions/' + position.id + '/schedule?week_start=' + ws);
          const full = rows.filter((c) => {
            const cap = c.max_per_shift == null ? Infinity : Number(c.max_per_shift);
            return wanted.indexOf(keyOf(c)) >= 0 && !c.mine && c.people >= cap;
          }).map((c) => c.shift_name + ' ' + DAY_LONG[c.weekday] + ' ' + dm(c.work_date));
          await load('Chưa lưu được vì ' + (full.length ? full.join(', ') + ' đã đủ người' : 'có ca đã đủ người') + '. Lịch đã được tải lại; hãy chọn ca khác rồi lưu lại.');
        } catch (x) { await load(er.message + ' Lịch đã được tải lại; hãy chọn ca khác rồi lưu lại.'); }
      } else setSmsg({ text: er.message, kind: 'err' });
    }
    setSaving('');
  }

  let content;
  const s = view.status;
  if (s === 'error') content = <p className="msg err" role="alert">{view.text}</p>;
  else if (s === 'none') content = <Empty title="Bạn chưa được nhận vào vị trí nào" sub="Khi chủ quán nhận hồ sơ, bạn sẽ đăng ký ca tại đây." />;
  else if (s === 'removed') {
    content = (<>
      <Empty title="Bạn không còn làm ở vị trí này" sub="Chủ quán đã xóa bạn khỏi danh sách nhân viên nên không thể đăng ký lịch làm ở đây." />
      <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}><a className="btn" href="/schedule">Xem lịch các việc đang làm</a></div>
    </>);
  } else if (s === 'loading') content = <p className="muted">Đang tải…</p>;
  else if (s === 'empty') content = <Empty title="Vị trí này chưa có ca làm" sub="Hãy liên hệ chủ quán để thêm ca." />;
  else {
    const isBusy = mode === 'busy';
    const p = position;
    const limit = (p.min_week_hours != null || p.max_week_hours != null) ? 'Quy định: ' + (p.min_week_hours || 0) + ' – ' + (p.max_week_hours || '…') + ' giờ/tuần. ' : '';
    const mineShift = {};
    cells.forEach((c) => { mineShift[c.shift_id] = 1; });
    const elsewhere = busy.filter((b) => !(b.own && mineShift[b.shift_id]));
    content = (<>
      <div className="tabs pill" role="tablist" aria-label="Chế độ chọn">
        <button type="button" role="tab" aria-selected={!isBusy} onClick={() => setMode('shift')}>Đăng ký ca làm</button>
        <button type="button" role="tab" aria-selected={isBusy} onClick={() => setMode('busy')}>Báo bận</button>
      </div>
      {!isBusy && p.schedule_note ? <p className="msg info"><strong>Ghi chú từ chủ quán:</strong> <span className="pre-line">{p.schedule_note}</span></p> : null}
      {isBusy
        ? <p className="msg info">Bấm vào ca bạn <strong>không làm được</strong> (ô tô chéo). Ca đó bị khóa ở mọi việc của bạn nếu trùng giờ, và chủ quán chỉ thấy &quot;bận&quot;, không thấy lý do. Bạn đang báo bận <strong>{Object.keys(busySel).length} ca</strong>. Ca đã đăng ký làm cần bỏ trước ở chế độ &quot;Đăng ký ca làm&quot;.</p>
        : <p className="msg info">{limit}Mỗi ca có số người tối đa do chủ quán quy định; ai lưu trước được giữ chỗ trước. Bạn đang chọn <strong>{selCount} ca · {hours} giờ</strong>. Ca đã qua không đổi được.</p>}
      {!isBusy && notice ? <p className={'msg ' + notice.kind} role="status">{notice.text}</p> : null}
      {isBusy
        ? <ScheduleGrid cells={cells} sel={busySel} edit busy={elsewhere} mode="busy" onToggle={toggle} />
        : <ScheduleGrid cells={cells} sel={sel} edit busy={busy} onToggle={toggle} />}
      {smsg ? <p className={('msg ' + smsg.kind).trim()} role="status">{smsg.text}</p> : null}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {isBusy
          ? <button type="button" className="btn btn-primary btn-lg" disabled={saving === 'busy'} onClick={saveBusy}>{saving === 'busy' ? 'Đang lưu…' : 'Lưu ca bận'}</button>
          : <button type="button" className="btn btn-primary btn-lg" disabled={saving === 'shift' || !!(notice && notice.kind === 'err')} onClick={saveShifts}>{saving === 'shift' ? 'Đang lưu…' : 'Lưu lịch làm'}</button>}
      </div>
    </>);
  }

  return (
    <Page layout="seeker" active="schedule">
      <main className="stack">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/jobs">Trang chủ</Link> → <Link href="/my-jobs">Xem công việc</Link> → <span>Đăng ký lịch làm</span></nav>
        <h1 style={{ margin: 0, fontSize: 26 }}>Đăng ký lịch làm</h1>
        <GoogleCalendar savedRef={savedRef} />
        <div className="row between">
          <div className="tabs pill" role="tablist">
            {[['Tuần này', 0], ['Tuần sau', 1]].map(([t, w]) => <button key={w} type="button" role="tab" aria-selected={week === w} onClick={() => setWeek(w)}>{t}</button>)}
          </div>
          <div className="field" hidden={!jobs || jobs.length < 2 || s === 'removed'}><label htmlFor="pos">Vị trí đang làm</label>
            <select id="pos" value={posIdx} onChange={(e) => setPosIdx(Number(e.target.value))}>
              {(jobs || []).map((r, i) => <option key={r.id} value={i}>{r.position.title + ' · ' + (r.position.shop && r.position.shop.name)}</option>)}
            </select></div>
        </div>
        <div>{content}</div>
      </main>
    </Page>
  );
}
