'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const formatSalary = require('../public/js/salary');

for (const [unit, amount, expected] of [
  ['hour', 25000, '25.000đ/giờ'],
  ['shift', 200000, '200.000đ/ca'],
  ['day', 350000, '350.000đ/ngày'],
  ['month', 7200000, '7.200.000đ/tháng'],
  ['month', '7500000', '7.500.000đ/tháng'],
]) {
  test('đúng số tiền và đơn vị ' + unit + ' / ' + amount, () => {
    assert.equal(formatSalary({ salary_amount: amount, salary_unit: unit }), expected);
  });
}
test('lương thỏa thuận không suy ra đơn vị từ số tiền', () => {
  assert.equal(formatSalary({ salary_amount: null, salary_unit: 'negotiable' }), 'Thỏa thuận');
  assert.equal(formatSalary({ salary_amount: 7200000, salary_unit: 'negotiable' }), 'Thỏa thuận');
  assert.equal(formatSalary({ salary_amount: '', salary_unit: 'hour' }), 'Thỏa thuận');
  assert.equal(formatSalary(null), 'Thỏa thuận');
});
test('đơn vị thiếu hoặc không hợp lệ không bị gắn nhầm đ/giờ', () => {
  for (const unit of [undefined, '', 'year', 'toString', '<script>']) {
    assert.equal(formatSalary({ salary_amount: 7200000, salary_unit: unit }), 'Chưa cập nhật');
  }
});
test('không hiển thị lương âm, số lẻ, vô hạn hoặc vượt integer của database', () => {
  for (const amount of [-1, 0, 1.5, Infinity, NaN, 'abc', 2147483648]) {
    assert.equal(formatSalary({ salary_amount: amount, salary_unit: 'hour' }), 'Chưa cập nhật');
  }
});
