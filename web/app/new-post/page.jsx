'use client';
// Đăng tin tuyển / Sửa tin (/new-post?edit=<id>)
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import JobCard from '@/components/JobCard';
import Page from '@/components/Page';
import { useDialog } from '@/components/Dialog';
import { Empty, Notice } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { dateVN, formatSalary, hh, todayISO } from '@/lib/format';

const DRAFT = 'cr_post_draft';
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const BLANK = {
  title: '', salary: '', salary_unit: 'negotiable', summary: '', noexp: false, intern: false, addr: '', work_form: '',
  tasks: '', reqs: '', perks: '', open: '', close: '', head: '', pend: '', minw: '', maxw: '', maxd: '', minp: '', maxp: '',
  deadline: '', start: '', mgr: '', mgp: '',
};
const FIRST_SHIFT = [{ id: null, name: 'Ca sáng', start: 8, end: 12 }];
const str = (v) => (v == null ? '' : String(v));
const numOrNull = (v) => (String(v).trim() === '' ? null : Number(v));
const lines = (text, kind) => text.split('\n').map((l) => l.trim()).filter(Boolean).map((content) => ({ kind, content }));
const itemsText = (d, kind) => (d.items || []).filter((i) => i.kind === kind).map((i) => i.content).join('\n');
const store = (fn) => { try { return fn(localStorage); } catch (x) { return null; } };

// Giờ theo bước 15 phút, 00:00 → 24:00
const HOURS = Array.from({ length: 97 }, (_, q) => q / 4);
function HourSelect({ value, onChange, blank, ...rest }) {
  return (
    <select value={value == null ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} {...rest}>
      {blank ? <option value="">Chọn giờ</option> : null}
      {HOURS.map((h) => <option key={h} value={String(h)}>{hh(h)}</option>)}
    </select>
  );
}

function NewPostForm() {
  const router = useRouter();
  const dlg = useDialog();
  const editId = useSearchParams().get('edit');
  const [f, setF] = useState(BLANK);
  const [mode, setMode] = useState('offline');
  const [days, setDays] = useState([]);
  const [shifts, setShifts] = useState(editId ? [] : FIRST_SHIFT);
  const [orig, setOrig] = useState(null); // tin đang sửa
  const [info, setInfo] = useState(null); // hồ sơ/nhân viên/ca bị khóa
  const [shop, setShop] = useState(null);
  const [templates, setTemplates] = useState(null);
  const [draftNote, setDraftNote] = useState('Nội dung bạn nhập được tự lưu thành bản nháp trong trình duyệt này.');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const draftTimer = useRef(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const lockedShift = (id) => !!(id != null && id !== '' && info && info.locked_shifts.indexOf(String(id)) >= 0);
  const lockedDay = (d) => !!(info && info.locked_days.indexOf(d) >= 0);

  // Dữ liệu gửi lên server (và dùng cho xem trước / bản nháp)
  const read = useCallback(() => {
    const unit = f.salary_unit;
    return {
      title: f.title.trim(), mode,
      salary_amount: unit === 'negotiable' ? null : numOrNull(f.salary),
      salary_unit: unit === 'negotiable' || numOrNull(f.salary) == null ? 'negotiable' : unit,
      summary: f.summary.trim(), no_experience: f.noexp, accepts_intern: f.intern,
      address: f.addr.trim(), work_form: f.work_form.trim(),
      work_days: days.slice().sort(),
      shifts: shifts.map((s) => ({ id: s.id == null ? undefined : s.id, name: s.name.trim(), start_hour: Number(s.start), end_hour: Number(s.end) })),
      open_hour: numOrNull(f.open), close_hour: numOrNull(f.close), headcount: numOrNull(f.head), pending_limit: numOrNull(f.pend),
      min_week_hours: numOrNull(f.minw), max_week_hours: numOrNull(f.maxw), max_day_hours: numOrNull(f.maxd),
      min_per_shift: numOrNull(f.minp), max_per_shift: numOrNull(f.maxp),
      deadline: f.deadline.trim() || null, start_date: f.start.trim() || null,
      contact_name: f.mgr.trim(), contact_phone: f.mgp.trim().replace(/[\s.]/g, ''),
      items: lines(f.tasks, 'task').concat(lines(f.reqs, 'requirement'), lines(f.perks, 'perk')),
    };
  }, [f, mode, days, shifts]);

  // ----- Điền form từ dữ liệu (bản nháp, tin cũ làm mẫu, hoặc tin đang sửa) -----
  // keepIds: chỉ khi sửa tin – giữ id ca để server biết ca nào là ca cũ
  const apply = useCallback((d, keepIds) => {
    setF({
      ...BLANK,
      title: str(d.title), summary: str(d.summary), addr: str(d.address), work_form: str(d.work_form),
      salary: str(d.salary_amount), salary_unit: d.salary_unit || 'negotiable', noexp: !!d.no_experience, intern: !!d.accepts_intern,
      tasks: itemsText(d, 'task'), reqs: itemsText(d, 'requirement'), perks: itemsText(d, 'perk'),
      open: d.open_hour == null ? '' : Number(d.open_hour), close: d.close_hour == null ? '' : Number(d.close_hour),
      head: str(d.headcount), pend: str(d.pending_limit), minw: str(d.min_week_hours), maxw: str(d.max_week_hours), maxd: str(d.max_day_hours),
      minp: str(d.min_per_shift), maxp: str(d.max_per_shift), deadline: str(d.deadline), start: str(d.start_date),
      mgr: str(d.contact_name), mgp: str(d.contact_phone),
    });
    setMode(d.mode === 'online' ? 'online' : 'offline');
    setDays((d.work_days || []).map(Number));
    setShifts((d.shifts || []).map((s) => ({
      id: keepIds ? s.id : null, name: s.name || '',
      start: s.start_hour == null ? 8 : Number(s.start_hour), end: s.end_hour == null ? 12 : Number(s.end_hour),
    })));
  }, []);

  // Khởi tạo: tin đang sửa, hoặc bản nháp + danh sách tin cũ làm mẫu
  useEffect(() => {
    let dead = false;
    Auth.call('GET', '/api/me').then((me) => { if (!dead) setShop(me.shop || {}); }).catch(() => {});
    if (editId) {
      const id = encodeURIComponent(editId);
      Promise.all([
        Auth.call('GET', '/api/positions/' + id),
        Auth.call('GET', '/api/positions/' + id + '/contact').catch(() => null),
        Auth.call('GET', '/api/positions/' + id + '/edit-info'),
      ]).then(([o, contact, i]) => {
        if (dead) return;
        setOrig(o); setInfo(i);
        apply(Object.assign({}, o, contact || {}), true);
        setReady(true);
      }).catch((e) => { if (!dead) setErr({ text: 'Không tải được tin để sửa: ' + e.message }); });
    } else {
      const saved = store((ls) => ls.getItem(DRAFT));
      if (saved) {
        try { apply(JSON.parse(saved)); setDraftNote('Đã khôi phục bản nháp lần trước.'); } catch (x) { store((ls) => ls.removeItem(DRAFT)); }
      }
      Auth.call('GET', '/api/me/shop/positions').then((rows) => { if (!dead) setTemplates(rows); }).catch(() => { if (!dead) setTemplates([]); });
      setReady(true);
    }
    return () => { dead = true; };
  }, [editId, apply]);

  // ----- Bản nháp: tự lưu trong trình duyệt, mất khi đăng thành công hoặc bấm xóa (không dùng khi sửa tin) -----
  useEffect(() => {
    if (editId || !ready) return undefined;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const ok = store((ls) => { const d = read(); d.shifts.forEach((s) => { delete s.id; }); ls.setItem(DRAFT, JSON.stringify(d)); return true; });
      if (ok) setDraftNote('Đã lưu bản nháp trong trình duyệt này.');
    }, 400);
    return () => clearTimeout(draftTimer.current);
  }, [read, editId, ready]);

  function clearDraft() {
    clearTimeout(draftTimer.current);
    store((ls) => ls.removeItem(DRAFT));
    apply({ shifts: [{ name: 'Ca sáng', start_hour: 8, end_hour: 12 }] });
    setDraftNote('Đã xóa bản nháp.');
  }

  function loadTemplate(id) {
    if (!id) return;
    setDraftNote('Đang tải tin mẫu…');
    Promise.all([Auth.call('GET', '/api/positions/' + id), Auth.call('GET', '/api/positions/' + id + '/contact').catch(() => ({}))]).then(([p, c]) => {
      const d = Object.assign({}, p, c || {});
      delete d.deadline; delete d.start_date; // hạn và ngày bắt đầu của tin cũ đã quá hạn
      apply(d);
      setDraftNote('Đã điền từ tin “' + (p.title || '') + '”. Hãy chỉnh lại rồi đăng, nhớ chọn hạn ứng tuyển và ngày bắt đầu mới.');
    }).catch((er) => setDraftNote('Không tải được tin mẫu: ' + er.message));
  }

  function check(d) {
    if (!d.title) return 'Vui lòng nhập tên vị trí';
    if (!d.address) return 'Vui lòng nhập địa điểm làm việc';
    if (['hour', 'shift', 'day', 'month', 'negotiable'].indexOf(d.salary_unit) < 0) return 'Vui lòng chọn đơn vị lương hợp lệ';
    if (d.salary_unit !== 'negotiable' && (!Number.isInteger(d.salary_amount) || d.salary_amount <= 0 || d.salary_amount > 2147483647)) return 'Mức lương phải là số nguyên dương, không vượt 2.147.483.647';
    if (!d.work_days.length) return 'Chọn ít nhất một ngày làm việc';
    if (!d.shifts.length) return 'Thêm ít nhất một ca làm việc';
    if (d.open_hour == null || d.close_hour == null) return 'Vui lòng chọn giờ mở cửa và giờ đóng cửa';
    if (d.close_hour <= d.open_hour) return 'Giờ đóng cửa phải sau giờ mở cửa';
    for (let i = 0; i < d.shifts.length; i++) {
      const s = d.shifts[i];
      if (!s.name) return 'Ca ' + (i + 1) + ': vui lòng nhập tên ca';
      if (s.end_hour <= s.start_hour) return 'Ca ' + (i + 1) + ': giờ kết thúc phải sau giờ bắt đầu';
      if (s.start_hour < d.open_hour) return 'Ca ' + (i + 1) + ' bắt đầu trước giờ mở cửa (' + hh(d.open_hour) + ')';
      if (s.end_hour > d.close_hour) return 'Ca ' + (i + 1) + ' kết thúc sau giờ đóng cửa (' + hh(d.close_hour) + ')';
    }
    if (d.min_week_hours == null || d.max_week_hours == null) return 'Vui lòng nhập giờ tối thiểu và tối đa mỗi tuần';
    if (d.max_day_hours == null) return 'Vui lòng nhập số giờ tối đa mỗi ngày';
    if (d.max_day_hours < 1 || d.max_day_hours > d.close_hour - d.open_hour) return 'Giờ tối đa mỗi ngày phải từ 1 đến ' + (d.close_hour - d.open_hour) + ' (số giờ mở cửa)';
    const longest = Math.max(...d.shifts.map((s) => s.end_hour - s.start_hour));
    if (longest > d.max_day_hours) return 'Có ca dài ' + longest + ' giờ, vượt số giờ tối đa mỗi ngày (' + d.max_day_hours + ')';
    if (d.headcount != null && d.headcount < 1) return 'Số người cần tuyển phải từ 1 trở lên';
    if (info && (d.headcount || 1) < info.filled) return 'Số người cần tuyển không được thấp hơn số người đã nhận (' + info.filled + ')';
    if (d.max_per_shift == null || d.max_per_shift < 1) return 'Số người tối đa mỗi ca phải từ 1 trở lên';
    if (!d.items.some((i) => i.kind === 'task')) return 'Vui lòng nhập nhiệm vụ chính';
    if (d.min_week_hours > d.max_week_hours) return 'Giờ tối thiểu/tuần không được lớn hơn tối đa';
    if (d.min_per_shift != null && d.min_per_shift > d.max_per_shift) return 'Số người tối thiểu/ca không được lớn hơn tối đa';
    if (!d.deadline) return 'Vui lòng chọn hạn ứng tuyển';
    if (d.deadline < todayISO() && !(orig && d.deadline === orig.deadline)) return 'Hạn ứng tuyển không được ở trong quá khứ';
    if (!d.start_date) return 'Vui lòng chọn ngày bắt đầu làm';
    if (d.start_date < d.deadline) return 'Ngày bắt đầu làm không được trước hạn ứng tuyển';
    if (!d.contact_name) return 'Vui lòng nhập người liên hệ phỏng vấn';
    if (!/^0\d{9}$/.test(d.contact_phone)) return 'SĐT liên hệ phải gồm 10 chữ số, bắt đầu bằng 0';
    return '';
  }

  // Nhóm nhạy cảm đã đổi so với tin gốc (chỉ khi sửa)
  function sensitiveChanges(d) {
    if (!orig) return [];
    const n = (v) => (v == null || v === '' ? null : Number(v));
    const sig = (list) => (list || []).map((s) => (s.id || 'new') + '@' + n(s.start_hour) + '-' + n(s.end_hour)).sort().join('|');
    const out = [];
    if (n(d.salary_amount) !== n(orig.salary_amount) || (d.salary_unit || 'negotiable') !== (orig.salary_unit || 'negotiable')) out.push('mức lương');
    if (d.work_days.slice().sort().join() !== (orig.work_days || []).map(Number).sort().join()) out.push('ngày làm');
    if (n(d.open_hour) !== n(orig.open_hour) || n(d.close_hour) !== n(orig.close_hour)) out.push('giờ mở/đóng cửa');
    if (sig(d.shifts) !== sig(orig.shifts)) out.push('ca làm');
    return out;
  }

  function submit(e) {
    e.preventDefault();
    if (editId && !orig) return;
    const d = read();
    const problem = check(d);
    if (problem) { setErr({ text: problem }); return; }
    setErr(null);
    d.headcount = d.headcount || 1;
    if (d.pending_limit == null) d.pending_limit = 10;
    if (d.min_per_shift == null) d.min_per_shift = 1;
    d.max_shift_hours = Math.max(...d.shifts.map((s) => s.end_hour - s.start_hour));
    // Khi sửa: cho phép xóa trắng lương (= thỏa thuận), mô tả ngắn, cách làm việc
    const clearable = editId ? ['salary_amount', 'summary', 'work_form'] : [];
    Object.keys(d).forEach((k) => {
      if (d[k] === '') d[k] = null;
      if (d[k] === null && clearable.indexOf(k) < 0) delete d[k];
    });
    const warn = info && info.has_people ? sensitiveChanges(d) : [];
    if (warn.length) d.confirm_sensitive = true;
    confirmSave(d, warn);
  }

  // Xác nhận nhẹ trước khi lưu: tóm tắt lương, số người, hạn nộp, SĐT (+ cảnh báo nếu đổi nhóm nhạy cảm)
  function confirmSave(d, warn) {
    const rows = [['Lương', formatSalary(d)], ['Số người cần tuyển', (d.headcount || 1) + ' người'], ['Hạn ứng tuyển', dateVN(d.deadline)], ['SĐT liên hệ', d.contact_phone]];
    dlg.open({
      title: editId ? 'Kiểm tra lại trước khi lưu' : 'Kiểm tra lại trước khi đăng',
      body: 'Ứng viên sẽ thấy các thông tin này đầu tiên. Hãy chắc chắn chúng đúng.',
      actions: (<>
        <dl className="facts">{rows.map((r) => <span key={r[0]} style={{ display: 'contents' }}><dt>{r[0]}</dt><dd className="b">{r[1]}</dd></span>)}</dl>
        {warn.length ? <p className="msg warn">Bạn đang đổi {warn.join(', ')} trong khi tin đã có {info.pending} hồ sơ chờ và {info.filled} người đã nhận. Họ sẽ thấy thông tin mới.</p> : null}
        <button type="button" className="btn btn-primary" style={{ marginTop: 4 }} onClick={() => { dlg.close(); send(d); }}>{editId ? 'Lưu thay đổi' : 'Đăng tin'}</button>
        <button type="button" className="btn" onClick={dlg.close}>Quay lại sửa</button>
      </>),
    });
  }

  async function send(d) {
    setBusy(true);
    try {
      await Auth.call(editId ? 'PUT' : 'POST', editId ? '/api/positions/' + encodeURIComponent(editId) : '/api/positions', d);
      if (!editId) { clearTimeout(draftTimer.current); store((ls) => ls.removeItem(DRAFT)); }
      router.push('/positions');
    } catch (er) {
      setBusy(false); setErr({ text: er.message });
      // có người vừa ứng tuyển / đăng ký lịch trong lúc sửa: tải lại tình trạng để lần lưu sau hỏi đúng
      if (editId && er.status === 409) Auth.call('GET', '/api/positions/' + encodeURIComponent(editId) + '/edit-info').then(setInfo).catch(() => {});
    }
  }

  const draft = read();
  const preview = useMemo(() => (draft.title ? (
    <JobCard preview loggedIn p={{
      id: '', title: draft.title, shop_name: (shop && shop.name) || '', mode: draft.mode, salary_amount: draft.salary_amount, salary_unit: draft.salary_unit,
      work_days: draft.work_days, open_hour: draft.open_hour, close_hour: draft.close_hour, address: draft.address, summary: draft.summary,
    }} />
  ) : <Empty title="Nhập tên vị trí để xem trước" />), [draft.title, draft.mode, draft.salary_amount, draft.salary_unit, draft.work_days.join(), draft.open_hour, draft.close_hour, draft.address, draft.summary, shop]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitText = editId ? 'Lưu thay đổi' : 'Đăng tin tuyển';
  const loadingEdit = editId && !orig && !err;
  const shopOk = shop && shop.name && shop.address && shop.phone;
  const setShift = (i, patch) => setShifts((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const toggleDay = (d) => {
    if (days.indexOf(d) >= 0) {
      if (lockedDay(d)) { setErr({ text: 'Không bỏ được ngày ' + DAYS[d] + ' vì đã có nhân viên đăng ký lịch tuần này hoặc tuần sau.' }); return; }
      setDays(days.filter((x) => x !== d));
    } else setDays(days.concat(d));
  };
  const num = (k, props) => <input id={'n_' + k} type="number" min="0" value={f[k]} onChange={(e) => set(k, e.target.value)} {...props} />;

  return (
    <main className="stack">
      <Link className="back" href="/positions">← Vị trí &amp; tuyển dụng</Link>
      <div><h1 style={{ margin: '0 0 4px', fontSize: 26 }}>{editId ? 'Sửa tin tuyển' : 'Đăng tin tuyển'}</h1>
        <p className="muted small" style={{ margin: 0 }}>{editId
          ? 'Sửa tin không tự đóng hay mở lại tin. Số người cần tuyển không được thấp hơn số người đã nhận.'
          : 'Các phần đánh số khớp 1–1 với trang chi tiết công việc mà ứng viên thấy. Khung bên phải là bản xem trước.'}</p></div>
      <div className="two-col rev">
        <form className="stack-col" style={{ gap: 16 }} onSubmit={submit}>
          {info && info.has_people ? (
            <Notice msg={{ kind: 'warn', text: 'Tin này đã có ' + info.pending + ' hồ sơ chờ, ' + info.filled + ' người đã nhận' + (info.employees ? ' (' + info.employees + ' nhân viên đang làm)' : '') +
              '. Đổi lương, ngày làm, ca hoặc giờ mở/đóng cửa sẽ ảnh hưởng tới họ – bạn sẽ được hỏi xác nhận trước khi lưu.' +
              (info.locked_shifts.length ? ' Ca và ngày đã có người đăng ký lịch không xóa hay đổi giờ được.' : '') }} role="status" />
          ) : null}
          {!editId && (
            <div className="sect">
              {templates && templates.length > 0 && (
                <div className="field"><label htmlFor="n_tpl">Dùng tin cũ làm mẫu</label>
                  <select id="n_tpl" defaultValue="" onChange={(e) => loadTemplate(e.target.value)}>
                    <option value="">— Chọn tin cũ —</option>
                    {templates.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select></div>
              )}
              <p className="tiny muted" style={{ margin: 0 }} role="status">{draftNote}</p>
              <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={clearDraft}>Xóa bản nháp, nhập lại từ đầu</button>
            </div>
          )}
          <fieldset className="sect"><legend className="sr-only">Tiêu đề tin</legend><h2>Tiêu đề tin</h2>
            <div className="cols">
              <div className="field"><label htmlFor="n_title">Tên vị trí *</label><input id="n_title" type="text" placeholder="Ví dụ: Nhân viên thu ngân" value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
              <div className="field"><label htmlFor="n_salary">Mức lương</label>
                <input id="n_salary" type="number" min="1" max="2147483647" step="1" inputMode="numeric" placeholder="Ví dụ: 25000" aria-describedby="n_salary_hint"
                  disabled={f.salary_unit === 'negotiable'} value={f.salary} onChange={(e) => set('salary', e.target.value)} />
                <span className="hint" id="n_salary_hint">Để trống số tiền nếu lương thỏa thuận.</span></div>
              <div className="field"><label htmlFor="n_salary_unit">Đơn vị lương</label>
                <select id="n_salary_unit" name="salary_unit" value={f.salary_unit} onChange={(e) => set('salary_unit', e.target.value)}>
                  <option value="hour">Theo giờ</option><option value="shift">Theo ca</option><option value="day">Theo ngày</option><option value="month">Theo tháng</option><option value="negotiable">Thỏa thuận</option></select></div>
            </div>
            <div className="field"><label htmlFor="n_summary">Mô tả ngắn trên thẻ việc (tối đa 120 ký tự)</label><input id="n_summary" type="text" placeholder="Ví dụ: Order, mang đồ uống, dọn bàn." maxLength={120} value={f.summary} onChange={(e) => set('summary', e.target.value)} /></div>
            <div className="row"><label className="small"><input type="checkbox" style={{ width: 'auto' }} checked={f.noexp} onChange={(e) => set('noexp', e.target.checked)} /> Không yêu cầu kinh nghiệm</label>
              <label className="small"><input type="checkbox" style={{ width: 'auto' }} checked={f.intern} onChange={(e) => set('intern', e.target.checked)} /> Nhận thực tập</label></div></fieldset>

          <fieldset className="sect"><legend className="sr-only">1. Thông tin công việc</legend><h2>1. Thông tin công việc</h2>
            <div className="field"><span className="lab">Hình thức</span>
              <div className="chips" role="radiogroup">
                {[['offline', 'Offline'], ['online', 'Online']].map(([v, text]) => <button key={v} type="button" role="radio" className="chip lg solid" aria-pressed={mode === v} aria-checked={mode === v} onClick={() => setMode(v)}>{text}</button>)}
              </div></div>
            <div className="cols">
              <div className="field"><label htmlFor="n_addr">Địa điểm làm việc *</label><input id="n_addr" type="text" placeholder="Số nhà, đường, quận" value={f.addr} onChange={(e) => set('addr', e.target.value)} /></div>
              <div className="field"><label htmlFor="n_form">Cách làm việc</label><input id="n_form" type="text" placeholder="Ví dụ: Trực tiếp tại cửa hàng" value={f.work_form} onChange={(e) => set('work_form', e.target.value)} /></div></div>
            <div className="field"><span className="lab">Ngày làm việc * <span className="hint">(ca lặp lại các ngày này mỗi tuần)</span></span>
              <div className="chips">{DAYS.map((t, d) => <button key={d} type="button" className="chip" aria-pressed={days.indexOf(d) >= 0} title={lockedDay(d) ? 'Đã có nhân viên đăng ký lịch ngày này' : undefined} onClick={() => toggleDay(d)}>{t}</button>)}</div></div>
            <div className="field"><span className="lab">Ca làm việc * <span className="hint">(phải nằm trong giờ mở cửa ở phần 3; chọn được phút theo bước 15, ví dụ 08:30, 12:45)</span></span>
              <div className="stack-col" style={{ gap: 8 }}>
                {shifts.map((s, i) => {
                  const locked = lockedShift(s.id);
                  return (
                    <div className="row" style={{ gap: 8 }} key={i}>
                      <input type="text" placeholder="Tên ca" aria-label={'Tên ca ' + (i + 1)} value={s.name} onChange={(e) => setShift(i, { name: e.target.value })} style={{ flex: '1 1 140px', width: 'auto' }} />
                      <HourSelect aria-label={'Ca ' + (i + 1) + ' bắt đầu'} style={{ flex: '0 0 96px', width: 'auto' }} disabled={locked} value={s.start} onChange={(v) => setShift(i, { start: v })} /><span>–</span>
                      <HourSelect aria-label={'Ca ' + (i + 1) + ' kết thúc'} style={{ flex: '0 0 96px', width: 'auto' }} disabled={locked} value={s.end} onChange={(v) => setShift(i, { end: v })} />
                      <button type="button" className="btn btn-sm" aria-label={'Xóa ca ' + (i + 1)} disabled={locked} onClick={() => setShifts((l) => l.filter((_, j) => j !== i))}>Xóa</button>
                      {locked ? <span className="badge warn">Đã có người đăng ký lịch – chỉ đổi được tên ca</span> : null}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShifts((l) => l.concat({ id: null, name: '', start: 12, end: 17 }))}>+ Thêm ca</button></div>
            <p className="tiny muted" style={{ margin: 0 }}>Ảnh nơi làm việc lấy từ Hồ sơ cửa hàng – dùng chung cho mọi tin.</p></fieldset>

          <fieldset className="sect"><legend className="sr-only">2. Mô tả công việc</legend><h2>2. Mô tả công việc</h2><p className="muted small" style={{ margin: '-8px 0 0' }}>Mỗi dòng là một gạch đầu dòng ở trang chi tiết.</p>
            <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))' }}>
              <div className="field"><label htmlFor="n_tasks">Nhiệm vụ chính *</label><textarea id="n_tasks" rows={4} placeholder={'Phục vụ khách, nhận order\nDọn dẹp cuối ca'} value={f.tasks} onChange={(e) => set('tasks', e.target.value)} /></div>
              <div className="field"><label htmlFor="n_reqs">Yêu cầu ứng viên</label><textarea id="n_reqs" rows={4} placeholder={'Từ 18 tuổi\nGiao tiếp thân thiện'} value={f.reqs} onChange={(e) => set('reqs', e.target.value)} /></div>
              <div className="field"><label htmlFor="n_perks">Quyền lợi</label><textarea id="n_perks" rows={4} placeholder={'Lương theo giờ\nCó đào tạo'} value={f.perks} onChange={(e) => set('perks', e.target.value)} /></div></div></fieldset>

          <fieldset className="sect"><legend className="sr-only">3. Lịch làm việc và yêu cầu thời gian</legend><h2>3. Lịch làm việc và yêu cầu thời gian</h2>
            <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))' }}>
              <div className="field"><label htmlFor="n_open">Giờ mở cửa *</label><HourSelect id="n_open" blank value={f.open} onChange={(v) => set('open', v)} /></div>
              <div className="field"><label htmlFor="n_close">Giờ đóng cửa *</label><HourSelect id="n_close" blank value={f.close} onChange={(v) => set('close', v)} /></div>
              <div className="field"><label htmlFor="n_head">Số người cần tuyển</label>{num('head', info ? { min: String(Math.max(1, info.filled)) } : {})}</div>
              <div className="field"><label htmlFor="n_pend">Giới hạn hồ sơ chờ</label>{num('pend')}</div>
              <div className="field"><label htmlFor="n_minw">Tối thiểu giờ/tuần</label>{num('minw')}</div>
              <div className="field"><label htmlFor="n_maxw">Tối đa giờ/tuần</label>{num('maxw')}</div>
              <div className="field"><label htmlFor="n_maxd">Tối đa giờ/ngày</label>{num('maxd')}</div>
              <div className="field"><label htmlFor="n_minp">Tối thiểu người/ca</label>{num('minp')}</div>
              <div className="field"><label htmlFor="n_maxp">Tối đa người/ca</label>{num('maxp')}</div>
              <div className="field"><label htmlFor="n_deadline">Hạn ứng tuyển *</label><input id="n_deadline" type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} /></div>
              <div className="field"><label htmlFor="n_start">Ngày bắt đầu làm *</label><input id="n_start" type="date" value={f.start} onChange={(e) => set('start', e.target.value)} /></div></div></fieldset>

          <fieldset className="sect"><legend className="sr-only">4. Thông tin nhà tuyển dụng</legend><h2>4. Thông tin nhà tuyển dụng</h2>
            <p className="msg info" style={{ margin: 0 }}>{!shop ? 'Đang tải…' : shopOk
              ? <>Đăng với tên <strong>{shop.name}</strong> · {shop.address} · {shop.phone} · <Link className="tiny" href="/shop">Sửa hồ sơ cửa hàng</Link></>
              : <>Hồ sơ cửa hàng chưa đủ thông tin (tên, địa chỉ, SĐT, lĩnh vực). <Link className="tiny" href="/shop">Điền hồ sơ cửa hàng</Link> trước khi đăng tin.</>}</p>
            <div className="cols">
              <div className="field"><label htmlFor="n_mgr">Người liên hệ phỏng vấn *</label><input id="n_mgr" type="text" placeholder="Ví dụ: Chị Hạnh – quản lý" value={f.mgr} onChange={(e) => set('mgr', e.target.value)} /></div>
              <div className="field"><label htmlFor="n_mgp">SĐT liên hệ *</label><input id="n_mgp" type="tel" placeholder="10 số, bắt đầu bằng 0" value={f.mgp} onChange={(e) => set('mgp', e.target.value)} /></div></div>
            <p className="tiny muted" style={{ margin: 0 }}>SĐT chỉ hiện với ứng viên sau khi họ nộp hồ sơ.</p></fieldset>

          <Notice msg={err} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Link className="btn btn-lg" style={{ fontWeight: 700 }} href="/positions">Hủy</Link>
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy || loadingEdit}>{busy ? 'Đang lưu…' : loadingEdit ? 'Đang tải…' : submitText}</button>
          </div>
        </form>
        <aside className="preview" aria-label="Xem trước"><span className="tiny" style={{ fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-3)' }}>XEM TRƯỚC · ứng viên sẽ thấy</span><div>{preview}</div></aside>
      </div>
    </main>
  );
}

export default function NewPostPage() {
  return (
    <Page layout="employer" active="new">
      <Suspense fallback={null}><NewPostForm /></Suspense>
    </Page>
  );
}
