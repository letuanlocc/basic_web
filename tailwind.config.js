/** @type {import('tailwindcss').Config} */
// Tailwind chỉ dùng cho class tiện ích (bố cục, khoảng cách, chữ). Màu, font, bo góc lấy đúng từ bộ token trong
// public/css/style.css (:root) và CLAUDE.md; không thêm màu hay bo góc ngoài bộ token.
module.exports = {
  // Quét cả js/ vì một số HTML được dựng từ JavaScript.
  content: ['./public/**/*.html', './public/js/**/*.js'],
  // Tiền tố tw- tránh trùng tên với class sẵn có (.card, .sr-only, .container...).
  prefix: 'tw-',
  // style.css là bản reset/nền tảng của dự án; không nạp Preflight của Tailwind để không đổi giao diện hiện có.
  corePlugins: { preflight: false },
  // Class tiện ích thay cho style nội tuyến nên phải thắng các luật trong style.css (giống style="" trước đây).
  important: true,
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0E6F64', dark: '#0B5A51', soft: '#E6F2F0', line: '#CFE7E3' },
        ink: { DEFAULT: '#16181D', 2: '#3D434D', 3: '#5B6270', 4: '#6B7280' },
        surface: { DEFAULT: '#F6F7F9', 2: '#F1F3F6' },
        line: { DEFAULT: '#E3E6EB', 2: '#D0D5DD', 3: '#EEF0F3' },
        warn: { DEFAULT: '#93500A', bg: '#FEF3E2' },
        err: { DEFAULT: '#B42318', bg: '#FDECEA' },
      },
      fontFamily: { sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'] },
    },
    // Bo góc theo token: 6 (nhãn), 8 (nút, ô nhập), 12 (thẻ, hộp thoại), tròn (chip).
    borderRadius: { none: '0', sm: '6px', DEFAULT: '8px', lg: '12px', full: '9999px' },
    // Khoảng cách mặc định của Tailwind (bước 4px) đã khớp thang 4·8·12·16·24·32·48 của dự án.
  },
};
