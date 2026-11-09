# CaRảnh – nền tảng việc làm part-time

Express + Supabase ở `src/`, giao diện tĩnh ở `public/` (HTML/CSS/JS thuần, không framework).

## Nguồn thiết kế
Prototype chuẩn: https://claude.ai/code/artifact/326c6282-8ae5-4a1d-bb3f-429e730b823c
Mọi giao diện mới phải giống prototype. Nếu không mở được link, dùng các token và quy ước dưới đây.

## Trạng thái hiện tại
- Giao diện đã dựng đủ 17 trang trong `public/`, **chưa có logic**: không gọi API, không có dữ liệu mẫu.
- Chỗ có dữ liệu hiện khối "Chưa có dữ liệu" (component `.empty`).
- Mọi nút/form chưa có chức năng gắn `data-todo="Tên tính năng"` → bấm vào hiện hộp thoại "Tính năng chưa có sẵn".
- Nối API: thay các khối `.empty` và `data-todo` bằng dữ liệu thật từ `/api/*`, không đổi class/markup còn lại.

## Cấu trúc `public/`
- `css/style.css`: toàn bộ style. Token ở `:root`; component dùng class (`.btn`, `.chip`, `.card`, `.panel`, `.form-card`, `.field`, `.tabs`, `.badge`, `.empty`, `.sect`, `.sched`…).
- `js/main.js`: dựng header/thanh điều hướng dưới (mobile) và hộp thoại dùng chung.
- Mỗi màn hình là một file `.html` riêng.

Khai báo layout ở đầu trang rồi `main.js` tự thay thế:
```html
<div data-layout="seeker" data-active="home"></div>
```
`data-layout`: `guest` | `plain` (kèm `data-cta="login|register"`) | `overview` | `seeker` | `employer`. `data-active` là mục đang mở trong menu. Thêm mục menu mới thì sửa `layouts`/`bottoms` trong `main.js`.

## Token thiết kế
- Màu chủ đạo duy nhất: `--primary #0E6F64` (hover `--primary-dark #0B5A51`, nền chọn `--primary-soft #E6F2F0`). Mọi thứ khác là thang xám.
- Chữ: `--text #16181D`, phụ `#3D434D` / `#5B6270` / `#6B7280`. Nền trang `--bg #F6F7F9`, khối phụ `#F1F3F6`, viền `#E3E6EB`, viền ô nhập `#D0D5DD`.
- Trạng thái chỉ dùng trong nhãn nhỏ và luôn kèm chữ: thành công `.badge.ok`, chú ý `.badge.warn` (`#FEF3E2`/`#93500A`), lỗi `.badge.err` (`#FDECEA`/`#B42318`), trung tính `.badge`.
- Font: Be Vietnam Pro (400/500/600/700). H1 trang 24–28px/700; tiêu đề thẻ 16/600; lương 700; thân 15.
- Bo góc: 6 (nhãn), 8 (nút, ô nhập), 12 (thẻ, hộp thoại), tròn (chip). Viền 1px; bóng chỉ khi hover thẻ và hộp thoại.
- Khoảng cách theo thang 4·8·12·16·24·32·48. Thẻ padding 18, gap 16.
- Nút cao ≥ 44px (`.btn-lg` 48px). **Mỗi màn chỉ một nút chính** (`.btn-primary`).

## Quy ước
- Thứ tự thông tin trên thẻ việc cố định: ai tuyển → hình thức → lương, thời gian, địa điểm → mô tả ngắn → hành động.
- Dùng `<button>`/`<a>`/`<label>` thật, không `div` có onclick. Nút chỉ có icon phải có `aria-label`. Icon là SVG inline nét viền, không emoji.
- Responsive: dưới 720px menu trên ẩn, hiện thanh điều hướng dưới (`.bottomnav`, mỗi mục cao ≥ 48px).
- Không thêm màu, font, bo góc ngoài bộ token. Cần thành phần mới thì thêm class vào `style.css` (dùng biến `var(--…)`) và dùng lại, không viết style inline lặp lại.
- Văn bản giao diện bằng tiếng Việt; thông báo lỗi đặt ngay tại chỗ người dùng thao tác, không tự ẩn.
- Chạy thử: `npm run dev` rồi mở http://localhost:3000 (nếu `EADDRINUSE` thì cổng 3000 đang bị chiếm).
