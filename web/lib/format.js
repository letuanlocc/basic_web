// Hàm định dạng dùng chung (lương, giờ, ngày) – bản module của salary.js và các hàm nhỏ trong jobs.js.
const UNITS = { hour: 'giờ', shift: 'ca', day: 'ngày', month: 'tháng' };
const number = new Intl.NumberFormat('vi-VN');

export function formatSalary(position) {
  const p = position || {};
  if (p.salary_unit === 'negotiable' || p.salary_amount == null || p.salary_amount === '') return 'Thỏa thuận';
  const amount = Number(p.salary_amount);
  if (!Object.prototype.hasOwnProperty.call(UNITS, p.salary_unit) ||
      !Number.isInteger(amount) || amount <= 0 || amount > 2147483647) return 'Chưa cập nhật';
  return number.format(amount) + 'đ/' + UNITS[p.salary_unit];
}

// giờ dạng số thập phân: 8.5 → 08:30, 12.75 → 12:45
export function hh(h) {
  const m = Math.round(Number(h) * 60);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function dateVN(d) { return d ? String(d).split('-').reverse().join('/') : '—'; }

// 0 = thứ Hai (khớp week_start + weekday)
export const DAY = { 0: 'T2', 1: 'T3', 2: 'T4', 3: 'T5', 4: 'T6', 5: 'T7', 6: 'CN' };
export const STATUS = { pending: ['warn', 'Đang chờ'], accepted: ['ok', 'Đã được nhận'], rejected: ['err', 'Bị từ chối'], withdrawn: ['', 'Đã hủy'] };
export const LANG = { 0: 'Chưa có', 1: 'Giao tiếp cơ bản', 2: 'Khá', 3: 'Tốt' };
export const WORKMODE = { online: 'Online', offline: 'Offline', both: 'Online & Offline' };
export const SLOT = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối', weekend: 'Cuối tuần' };

export function workDays(p) { return (p.work_days || []).map((d) => DAY[d]).join(', '); }
export function whenText(p) {
  const t = [];
  if (p.work_days && p.work_days.length) t.push(workDays(p));
  if (p.open_hour != null && p.close_hour != null) t.push(hh(p.open_hour) + '–' + hh(p.close_hour));
  return t.join(' · ') || 'Theo thỏa thuận';
}

// ---- Lịch theo tuần ----
export const DAY_LONG = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];
export const isoDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const dm = (s) => { const p = s.split('-'); return p[2] + '/' + p[1]; };
// Thứ Hai của tuần cần xem (giờ địa phương); week: 0 = tuần này, 1 = tuần sau
export function weekStart(week) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + week * 7);
  return isoDate(d);
}
