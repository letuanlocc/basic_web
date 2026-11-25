'use client';
// Lưới ca: hàng = ngày, cột = ca.
//   edit   ô bấm được (button) thay vì chỉ xem (div)
//   sel    tập "shift_id:weekday" đang chọn
//   force  chủ quán chỉnh lịch: được chọn cả ca đã đủ người / ca trùng việc khác
//   busy   ca bận (từ /api/employments/:id/busy)
//   mode   'busy' = nhân viên tô ca bận (ô tô chéo = bận)
import { DAY_LONG, dm, hh } from '@/lib/format';

// Ca (c) trùng giờ với ca nhân viên đang giữ ở việc khác
function busyWith(c, busy) {
  const hit = (busy || []).filter((b) => {
    // chủ quán: server chỉ trả { shift_id, weekday, blocked } (không lộ việc khác)
    if (b.blocked !== undefined) return String(b.shift_id) === String(c.shift_id) && b.weekday === c.weekday;
    // nhân viên: có đủ giờ; own = ca chính mình tô bận, còn lại là ca ở việc khác
    return b.weekday === c.weekday && c.start_hour < b.end_hour && c.end_hour > b.start_hour;
  });
  return hit.filter((b) => b.blocked || b.own)[0] || hit[0]; // báo bận ưu tiên hơn ca trùng
}
const busyText = (b) => (b.blocked !== undefined || b.own ? '' : b.shop_name + ' – ' + b.position_title + ' (' + b.shift_name + ' ' + hh(b.start_hour) + '–' + hh(b.end_hour) + ')');

export default function ScheduleGrid({ cells, sel = {}, edit = false, force = false, busy = [], mode = 'shift', onToggle }) {
  const shifts = [], seen = {}, rows = {};
  cells.forEach((c) => {
    if (!seen[c.shift_id]) { seen[c.shift_id] = 1; shifts.push(c); }
    (rows[c.weekday] = rows[c.weekday] || {})[c.shift_id] = c;
  });
  shifts.sort((a, b) => a.start_hour - b.start_hour);

  return (
    <div className="sched-wrap">
      <div className="sched" style={{ '--n': shifts.length }}>
        <div className="r"><span />
          {shifts.map((s) => <span className="head" key={s.shift_id}><strong>{s.shift_name}</strong><small>{hh(s.start_hour)}–{hh(s.end_hour)}</small></span>)}
        </div>
        {Object.keys(rows).sort().map((wd) => {
          const first = rows[wd][shifts[0].shift_id] || rows[wd][Object.keys(rows[wd])[0]];
          return (
            <div className="r" key={wd}>
              <span className="day">{DAY_LONG[wd]}<small>{dm(first.work_date)}</small></span>
              {shifts.map((s) => {
                const c = rows[wd][s.shift_id];
                if (!c) return <span key={s.shift_id} />;
                const key = s.shift_id + ':' + wd;
                const mine = edit ? !!sel[key] : c.mine;
                const cap = c.max_per_shift == null ? Infinity : Number(c.max_per_shift);
                const other = edit ? busyWith(c, busy) : null;
                let cls, state, dis;
                if (mode === 'busy') {
                  if (c.mine) { cls = 'cell mine'; state = 'Đã đăng ký làm'; dis = true; }
                  else if (mine) { cls = 'cell busy'; state = 'Bạn báo bận'; dis = c.is_past; }
                  else if (other) { cls = 'cell busy'; state = other.own ? 'Bạn báo bận ở việc khác' : 'Bận việc khác'; dis = true; }
                  else { cls = 'cell'; state = ''; dis = c.is_past; }
                } else {
                  const full = !mine && c.people >= cap;
                  cls = 'cell' + (other ? ' busy' : mine ? ' mine' : full ? ' full' : c.understaffed ? ' need' : '');
                  state = other ? (other.blocked ? 'Nhân viên báo bận' : other.own ? 'Bạn báo bận' : force ? 'Nhân viên bận' : 'Bận việc khác')
                    : mine ? 'Đã chọn' : full ? 'Đã đủ người' : c.understaffed ? 'Đang thiếu người' : '';
                  if (other && mine && !other.blocked) state = 'Đã chọn · nhân viên bận';
                  dis = c.is_past || (full && !mine && !force) || (other && (other.blocked || other.own || (!force && !mine)));
                }
                const inner = (
                  <>
                    <span className="top"><span>{c.people}{c.max_per_shift != null ? '/' + c.max_per_shift : ''} người</span></span>
                    {state ? <span className="ppl">{state}</span> : null}
                    {other && busyText(other) ? <span className="ppl">{busyText(other)}</span> : null}
                    {!edit && c.names.length ? <span className="ppl">{c.names.join(', ')}</span> : null}
                  </>
                );
                if (!edit) return <div className={cls} key={s.shift_id}>{inner}</div>;
                return (
                  <button type="button" className={cls} key={s.shift_id} aria-pressed={!!mine} disabled={!!dis} onClick={() => onToggle(key)}
                    aria-label={s.shift_name + ', ' + DAY_LONG[wd] + ' ' + dm(c.work_date) + (state ? ', ' + state : '')}>{inner}</button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
