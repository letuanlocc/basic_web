// Định dạng lương theo đúng đơn vị của schema Supabase.
(function (root) {
  var UNITS = { hour: 'giờ', shift: 'ca', day: 'ngày', month: 'tháng' };
  var number = new Intl.NumberFormat('vi-VN');

  function formatSalary(position) {
    var p = position || {};
    if (p.salary_unit === 'negotiable' || p.salary_amount == null || p.salary_amount === '') return 'Thỏa thuận';
    var amount = Number(p.salary_amount);
    if (!Object.prototype.hasOwnProperty.call(UNITS, p.salary_unit) ||
        !Number.isInteger(amount) || amount <= 0 || amount > 2147483647) return 'Chưa cập nhật';
    return number.format(amount) + 'đ/' + UNITS[p.salary_unit];
  }

  if (typeof module === 'object' && module.exports) module.exports = formatSalary;
  else root.CR_SALARY = formatSalary;
})(typeof window === 'object' ? window : this);
