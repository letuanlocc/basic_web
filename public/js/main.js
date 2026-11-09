const unitLabel = { hour: '/giờ', shift: '/ca', day: '/ngày', month: '/tháng', negotiable: '' };

async function loadPositions() {
  const list = document.getElementById('products');
  try {
    const res = await fetch('/api/positions?limit=20');
    const { data } = await res.json();
    list.innerHTML = data.length
      ? data.map((p) => {
          const salary = p.salary_unit === 'negotiable'
            ? 'Thỏa thuận'
            : `${Number(p.salary_amount).toLocaleString('vi-VN')}đ${unitLabel[p.salary_unit]}`;
          return `<li><strong>${p.title}</strong> · ${p.shop_name || ''} — ${salary}</li>`;
        }).join('')
      : '<li>Chưa có tin tuyển</li>';
  } catch (e) {
    list.innerHTML = '<li>Không tải được dữ liệu</li>';
  }
}
loadPositions();
