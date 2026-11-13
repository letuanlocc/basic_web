const { httpError } = require('./db');

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
}

function terms(query = '') {
  if (typeof query !== 'string' || query.length > 200) {
    throw httpError(400, 'Từ khóa tìm kiếm phải là văn bản, tối đa 200 ký tự.');
  }
  return normalize(query).split(' ').filter(Boolean);
}

const SLOT = {
  morning: 'rảnh sáng morning', afternoon: 'rảnh chiều afternoon',
  evening: 'rảnh tối evening', weekend: 'rảnh cuối tuần weekend',
};
const MODE = { online: 'online', offline: 'offline', both: 'online offline' };

function matches(row, words) {
  const text = normalize([
    row.user && row.user.full_name, row.area, row.experience, row.strengths,
    row.availability_note, MODE[row.work_mode],
    ...(row.availability || []).map(a => SLOT[a.slot] || ''),
  ].filter(Boolean).join(' '));
  return words.every(word => text.includes(word));
}

module.exports = { terms, matches };
