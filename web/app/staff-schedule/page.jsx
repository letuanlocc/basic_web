'use client';
// Chủ quán: xem lịch làm của nhân viên, chỉnh lịch từng người, xóa nhân viên, ghi chú quy định
import { useEffect, useRef, useState } from 'react';
import Page from '@/components/Page';
import ScheduleGrid from '@/components/ScheduleGrid';
import { Empty } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { weekStart } from '@/lib/format';

const keyOf = (c) => c.shift_id + ':' + c.weekday;

export default function StaffSchedulePage() {
  const reqId = useRef(0);
  const [positions, setPositions] = useState(null);
  const [error, setError] = useState(null);
  const [posIdx, setPosIdx] = useState(0);
  const [week, setWeek] = useState(0); // 0 = tuần này, 1 = tuần sau
  const [data, setData] = useState(null); // { cells, staff }
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // { id, name }: nhân viên đang được chỉnh lịch
  const [sel, setSel] = useState({});
  const [busy, setBusy] = useState([]);
  const [flash, setFlash] = useState(null);
  const [emsg, setEmsg] = useState(null);
  const [needForce, setNeedForce] = useState(false);
  const [saving, setSaving] = useState('');
  const [rule, setRule] = useState('');
  const [rulemsg, setRulemsg] = useState(null);
  const [ruleSaving, setRuleSaving] = useState(false);

  const pos = positions && positions[posIdx];
  const ws = weekStart(week);

  useEffect(() => {
    Auth.call('GET', '/api/me/shop/positions').then(setPositions).catch((e) => setError(e.message));
  }, []);

  // quiet: làm mới ngầm (không đụng ô ghi chú, lỗi thì giữ nguyên lịch đang hiển thị)
  async function load({ showUpdated = false, quiet = false, edit = editing } = {}) {
    const id = ++reqId.current;
    if (!quiet) { setLoading(true); setLoadError(null); }
    try {
      const [cells, staff, p, mine, b] = await Promise.all([
        Auth.call('GET', '/api/positions/' + pos.id + '/schedule?week_start=' + ws),
        Auth.call('GET', '/api/positions/' + pos.id + '/employees'),
        Auth.call('GET', '/api/positions/' + pos.id),
        edit ? Auth.call('GET', '/api/employments/' + edit.id + '/schedule?week_start=' + ws) : null,
        edit ? Auth.call('GET', '/api/employments/' + edit.id + '/busy?week_start=' + ws).catch(() => []) : null,
      ]);
      if (id !== reqId.current) return;
      setBusy(b || []);
      if (!quiet) { setRule(p.schedule_note || ''); setRulemsg(null); }
      setData({ cells, staff });
      const s = {};
      if (edit) (mine || []).forEach((c) => { s[keyOf(c)] = 1; });
      setSel(s);
      if (showUpdated) setFlash({ kind: 'info', text: 'Đã tải lịch mới nhất từ dữ liệu đăng ký của nhân viên.' });
      setLoading(false);
    } catch (e) {
      if (id !== reqId.current) return;
      if (!quiet) setLoadError(e.message);
      setLoading(false);
    }
  }

  // Đổi vị trí hoặc tuần: tải lại từ đầu
  useEffect(() => { if (pos) { setEditing(null); setEmsg(null); setNeedForce(false); load({ edit: null }); } }, [pos && pos.id, week]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tự làm mới lịch mỗi 30 giây (im lặng) để HR thấy ca mới đăng ký; không làm khi đang chỉnh lịch
  const tick = useRef(null);
  tick.current = () => { if (!document.hidden && !editing && pos && !loading) load({ quiet: true }); };
  useEffect(() => { const t = setInterval(() => tick.current(), 30000); return () => clearInterval(t); }, []);

  const selHours = data ? data.cells.reduce((h, c) => h + (sel[keyOf(c)] ? c.end_hour - c.start_hour : 0), 0) : 0;
  const toggle = (k) => { setSel((x) => { const n = { ...x }; if (n[k]) delete n[k]; else n[k] = 1; return n; }); setNeedForce(false); };

  function startEdit(s, name) {
    const e = { id: s.id, name };
    setEditing(e); setEmsg(null); setNeedForce(false); setFlash(null);
    load({ edit: e });
  }

  async function saveSchedule(force) {
    const who = editing;
    const cells = data.cells.filter((c) => sel[keyOf(c)]).map((c) => ({ shift_id: c.shift_id, weekday: c.weekday }));
    setSaving(force ? 'force' : 'save'); setEmsg(null);
    try {
      const r = await Auth.call('PUT', '/api/employments/' + who.id + '/manage-schedule', { week_start: ws, cells, force });
      setEditing(null); setNeedForce(false);
      setFlash({ kind: '', text: 'Đã lưu lịch của ' + who.name + (r && r.total_hours != null ? '. Tổng ' + r.total_hours + ' giờ trong tuần.' : '.') });
      await load({ edit: null });
    } catch (er) {
      if (/^Trùng lịch việc khác/.test(er.message)) {
        // Cảnh báo, không chặn: chủ quán có thể chọn vẫn lưu
        setEmsg({ kind: 'warn', text: er.message.replace(/^Trùng lịch việc khác: /, 'Nhân viên đang bận vào: ') + '. Bỏ chọn các ca này, hoặc bấm "Vẫn lưu lịch" nếu bạn đã thỏa thuận với nhân viên.' });
        setNeedForce(true);
      } else setEmsg({ kind: 'err', text: er.message });
    }
    setSaving('');
  }

  async function removeStaff(s) {
    if (!window.confirm('Xóa nhân viên này khỏi danh sách? Các ca từ tuần này trở đi sẽ bị hủy.')) return;
    const keep = editing && editing.id === s.id ? null : editing;
    try {
      await Auth.call('DELETE', '/api/employments/' + s.id);
      setEditing(keep);
      await load({ edit: keep });
    } catch (er) { window.alert(er.message); }
  }

  async function saveRule() {
    setRuleSaving(true);
    try {
      await Auth.call('PUT', '/api/positions/' + pos.id, { schedule_note: rule.trim() || null });
      setRulemsg({ kind: '', text: 'Đã lưu ghi chú.' });
    } catch (er) { setRulemsg({ kind: 'err', text: er.message }); }
    setRuleSaving(false);
  }

  let content;
  if (error) content = <p className="msg err" role="alert">{error}</p>;
  else if (!positions) content = <p className="muted">Đang tải…</p>;
  else if (!positions.length) content = <Empty title="Chưa có vị trí nào" sub="Đăng tin tuyển để bắt đầu quản lý lịch làm." />;
  else if (loadError) content = <p className="msg err" role="alert">{loadError}</p>;
  else if (!data || loading) content = <p className="muted">Đang tải…</p>;
  else {
    const { cells, staff } = data;
    const booked = cells.filter((c) => c.people > 0).length;
    content = (<>
      {flash ? <p className={('msg ' + flash.kind).trim()} role="status">{flash.text}</p> : null}
      {!cells.length ? <Empty title="Vị trí này chưa có ca làm" sub="Thêm ca làm khi đăng tin để nhân viên đăng ký lịch." />
        : editing ? (
          <section className="panel"><h2>Chỉnh lịch của {editing.name}</h2>
            <p className="msg info">Bạn có thể chọn cả ca đã đủ người; ca đã qua không đổi được. Đang chọn <strong>{Object.keys(sel).length} ca · {selHours} giờ</strong>.</p>
            <ScheduleGrid cells={cells} sel={sel} edit force busy={busy} onToggle={toggle} />
            {emsg ? <p className={'msg ' + emsg.kind} role="status">{emsg.text}</p> : null}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => { setEditing(null); setSel({}); setEmsg(null); setNeedForce(false); }}>Hủy</button>
              {needForce ? <button type="button" className="btn" disabled={saving === 'force'} onClick={() => saveSchedule(true)}>{saving === 'force' ? 'Đang lưu…' : 'Vẫn lưu lịch'}</button> : null}
              <button type="button" className="btn btn-primary" disabled={saving === 'save'} onClick={() => saveSchedule(false)}>{saving === 'save' ? 'Đang lưu…' : 'Lưu lịch'}</button>
            </div>
          </section>
        ) : (
          <section className="panel"><div className="row between"><h2 style={{ margin: 0 }}>Lịch đã đăng ký</h2><span className="badge">{booked} ca có người</span></div>
            <p className="muted small">Lịch được cập nhật sau khi nhân viên lưu ca. Tên người đăng ký hiển thị ngay trong từng ca.</p>
            <ScheduleGrid cells={cells} />
          </section>
        )}
      <section className="panel"><h2>Nhân viên ({staff.length})</h2>
        {staff.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {staff.map((s) => {
              const u = (s.seeker && s.seeker.user) || {};
              const name = u.full_name || 'Nhân viên';
              return (
                <li className="row between" style={{ padding: '10px 0', borderTop: '1px solid var(--line-3)' }} key={s.id}>
                  <span><strong>{name}</strong> <span className="muted small">từ {String(s.started_at || '').slice(0, 10).split('-').reverse().join('/')}</span></span>
                  <span className="row"><button type="button" className="btn btn-sm" onClick={() => startEdit(s, name)}>Chỉnh lịch</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeStaff(s)}>Xóa khỏi danh sách</button></span>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted small" style={{ margin: 0 }}>Chưa có nhân viên nào ở vị trí này.</p>}
      </section>
    </>);
  }


  return (
    <Page layout="employer" active="staff">
      <main className="stack">
        <h1 style={{ margin: 0, fontSize: 26 }}>Lịch làm của nhân viên</h1>
        <div className="row between">
          <div className="tabs pill" role="tablist">
            {[['Tuần này', 0], ['Tuần sau', 1]].map(([t, w]) => <button key={w} type="button" role="tab" aria-selected={week === w} onClick={() => setWeek(w)}>{t}</button>)}
          </div>
          <div className="row">
            <div className="field" hidden={!positions || !positions.length}><label htmlFor="pos">Vị trí</label>
              <select id="pos" value={posIdx} onChange={(e) => { setPosIdx(Number(e.target.value)); }}>
                {(positions || []).map((r, i) => <option key={r.id} value={i}>{r.title}</option>)}
              </select></div>
            <button type="button" className="btn" disabled={loading || !pos} onClick={() => { setFlash(null); load({ showUpdated: true }); }}>Làm mới lịch</button>
          </div>
        </div>
        <div>{content}</div>
        {positions && positions.length > 0 && (
          <section className="panel"><div className="field"><label htmlFor="rule">Ghi chú quy định cho nhân viên</label>
            <textarea id="rule" rows={3} maxLength={500} placeholder="Ví dụ: Đăng ký ca cho tuần sau trước tối Chủ nhật." value={rule} onChange={(e) => setRule(e.target.value)} /></div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              {rulemsg ? <p className={('msg ' + rulemsg.kind).trim()} role="status">{rulemsg.text}</p> : null}
              <button type="button" className="btn btn-primary" disabled={ruleSaving} onClick={saveRule}>Lưu ghi chú</button></div></section>
        )}
      </main>
    </Page>
  );
}
