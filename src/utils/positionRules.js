// Quy tắc nghiệp vụ cho tin tuyển – chạy ở server nên gọi API trực tiếp cũng không vượt qua được.
// Giờ lưu dạng số thập phân theo bước 15 phút: 8.5 = 08:30, 12.75 = 12:45.

const HOUR_STEP = 0.25;
const TZ = 'Asia/Ho_Chi_Minh';

// Nhóm "nhạy cảm": đổi khi đã có hồ sơ / nhân viên thì phải xác nhận (confirm_sensitive)
const SENSITIVE = ['salary_amount', 'salary_unit', 'work_days', 'open_hour', 'close_hour'];
const SENSITIVE_LABEL = {
  salary_amount: 'mức lương', salary_unit: 'đơn vị lương', work_days: 'ngày làm', open_hour: 'giờ mở cửa', close_hour: 'giờ đóng cửa', shifts: 'ca làm',
};

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const isHour = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 24 && Number.isInteger(v / HOUR_STEP);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isPhone = (v) => /^0\d{9}$/.test(String(v || ''));

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
}

/** Thứ Hai của tuần hiện tại (+ offsetDays), dạng YYYY-MM-DD. */
function monday(offsetDays = 0) {
  const d = new Date(today() + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offsetDays);
  return d.toISOString().slice(0, 10);
}

function fmtHour(h) {
  const m = Math.round(Number(h) * 60);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** So sánh giá trị cũ/mới sau khi chuẩn hóa (null/'' như nhau, mảng không phân biệt thứ tự, số dạng chuỗi). */
function same(a, b) {
  const norm = (v) => {
    if (v === undefined || v === '') return null;
    if (Array.isArray(v)) return v.map(Number).sort((x, y) => x - y).join(',');
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) && !isDate(v)) return Number(v);
    return v;
  };
  return norm(a) === norm(b);
}

/**
 * Kiểm tra toàn bộ một tin (đã gộp dữ liệu cũ + mới). Trả chuỗi lỗi hoặc ''.
 * opts.requireContact: bắt buộc có người liên hệ + SĐT (khi tạo mới).
 */
function validatePosition(p, { requireContact = false } = {}) {
  if (!p.title || !String(p.title).trim()) return 'Vui lòng nhập tên vị trí';
  if (!p.address || !String(p.address).trim()) return 'Vui lòng nhập địa điểm làm việc';
  if (p.mode !== 'online' && p.mode !== 'offline') return 'Hình thức làm việc không hợp lệ';
  const unit = p.salary_unit || 'negotiable';
  if (!['hour', 'shift', 'day', 'month', 'negotiable'].includes(unit)) return 'Đơn vị lương không hợp lệ';
  const salary = num(p.salary_amount);
  if (unit !== 'negotiable' && (!Number.isInteger(salary) || salary <= 0 || salary > 2147483647)) return 'Mức lương phải là số nguyên dương';
  if (salary !== null && (!Number.isFinite(salary) || salary < 0)) return 'Mức lương không hợp lệ';

  const days = Array.isArray(p.work_days) ? p.work_days.map(Number) : [];
  if (!days.length) return 'Chọn ít nhất một ngày làm việc';
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return 'Ngày làm việc không hợp lệ';

  const open = num(p.open_hour), close = num(p.close_hour);
  if (open === null || close === null) return 'Vui lòng nhập giờ mở cửa và giờ đóng cửa';
  if (!isHour(open) || !isHour(close)) return 'Giờ mở/đóng cửa phải từ 00:00 đến 24:00, theo bước 15 phút';
  if (close <= open) return 'Giờ đóng cửa phải sau giờ mở cửa';

  const shifts = Array.isArray(p.shifts) ? p.shifts : [];
  if (!shifts.length) return 'Thêm ít nhất một ca làm việc';
  for (const [i, s] of shifts.entries()) {
    const st = num(s.start_hour), en = num(s.end_hour), n = `Ca ${i + 1}`;
    if (!s.name || !String(s.name).trim()) return `${n}: vui lòng nhập tên ca`;
    if (!isHour(st) || !isHour(en)) return `${n}: giờ không hợp lệ (bước 15 phút)`;
    if (en <= st) return `${n}: giờ kết thúc phải sau giờ bắt đầu`;
    if (st < open) return `${n} bắt đầu trước giờ mở cửa (${fmtHour(open)})`;
    if (en > close) return `${n} kết thúc sau giờ đóng cửa (${fmtHour(close)})`;
  }

  const minW = num(p.min_week_hours), maxW = num(p.max_week_hours), maxD = num(p.max_day_hours);
  if (minW === null || maxW === null) return 'Vui lòng nhập giờ tối thiểu và tối đa mỗi tuần';
  if (minW < 0 || minW > maxW) return 'Giờ tối thiểu/tuần không được lớn hơn tối đa';
  if (maxD === null) return 'Vui lòng nhập số giờ tối đa mỗi ngày';
  if (maxD < 1 || maxD > close - open) return `Giờ tối đa mỗi ngày phải từ 1 đến ${close - open} (số giờ mở cửa)`;
  const longest = Math.max(...shifts.map((s) => num(s.end_hour) - num(s.start_hour)));
  if (longest > maxD) return `Có ca dài ${longest} giờ, vượt số giờ tối đa mỗi ngày (${maxD})`;

  const head = num(p.headcount);
  if (head === null || !Number.isInteger(head) || head < 1) return 'Số người cần tuyển phải là số nguyên từ 1 trở lên';
  const maxP = num(p.max_per_shift), minP = num(p.min_per_shift);
  if (maxP === null || maxP < 1) return 'Số người tối đa mỗi ca phải từ 1 trở lên';
  if (minP !== null && minP > maxP) return 'Số người tối thiểu/ca không được lớn hơn tối đa';

  if (Array.isArray(p.items) && !p.items.some((i) => i.kind === 'task' && String(i.content || '').trim())) return 'Vui lòng nhập nhiệm vụ chính';

  if (!isDate(p.deadline)) return 'Vui lòng chọn hạn ứng tuyển';
  if (!isDate(p.start_date)) return 'Vui lòng chọn ngày bắt đầu làm';
  if (p.start_date < p.deadline) return 'Ngày bắt đầu làm không được trước hạn ứng tuyển';

  if (requireContact || p.contact_name !== undefined) {
    if (!p.contact_name || !String(p.contact_name).trim()) return 'Vui lòng nhập người liên hệ phỏng vấn';
  }
  if (requireContact || p.contact_phone !== undefined) {
    if (!isPhone(p.contact_phone)) return 'SĐT liên hệ phải gồm 10 chữ số, bắt đầu bằng 0';
  }
  return '';
}

/**
 * So ca cũ với danh sách ca gửi lên. Ca có id là ca cũ (giữ lại / sửa), không id là ca mới.
 * Trả { final, added, removed, retimed, renamed } hoặc ném lỗi chuỗi nếu id lạ.
 */
function planShifts(current, incoming) {
  // id trong DB là số, giao diện gửi lên dạng chuỗi → so sánh bằng String()
  const byId = new Map(current.map((s) => [String(s.id), s]));
  const final = incoming.map((s, i) => ({
    id: s.id != null && s.id !== '' ? (byId.has(String(s.id)) ? byId.get(String(s.id)).id : String(s.id)) : null,
    name: String(s.name || '').trim(),
    start_hour: num(s.start_hour),
    end_hour: num(s.end_hour),
    sort_order: i,
  }));
  const keep = new Set();
  for (const s of final) {
    if (!s.id) continue;
    if (!byId.has(String(s.id))) throw new Error('Ca làm không thuộc tin tuyển này');
    if (keep.has(s.id)) throw new Error('Ca làm bị lặp');
    keep.add(s.id);
  }
  const removed = current.filter((s) => !keep.has(s.id));
  const added = final.filter((s) => !s.id);
  const old = (s) => byId.get(String(s.id));
  const retimed = final.filter((s) => s.id && (!same(s.start_hour, old(s).start_hour) || !same(s.end_hour, old(s).end_hour)));
  const renamed = final.filter((s) => s.id && (s.name !== old(s).name || s.sort_order !== old(s).sort_order));
  return { final, added, removed, retimed, renamed };
}

module.exports = {
  SENSITIVE, SENSITIVE_LABEL, today, monday, fmtHour, same, num, validatePosition, planShifts,
};
