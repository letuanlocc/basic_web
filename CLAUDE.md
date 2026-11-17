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

## Tích hợp Google Calendar (đang làm dở)
Mục tiêu: khi nhân viên lưu lịch làm (`schedule.html`), các ca đã đăng ký xuất hiện trên Google Calendar của họ đúng ngày, đúng khung giờ. **Một chiều** (CaRảnh → Google), không đọc lại lịch Google.

### Tiến độ (cập nhật mục này khi làm xong từng bước)
- [x] **Bước 0 – Google Cloud**: đã tạo project, bật Calendar API, OAuth consent screen (External, **Testing**), OAuth Client (Web). Biến `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` có trong `.env.example`; mỗi người tự điền `.env` (secret xin người giữ project, **không dán vào chat/commit**).
- [x] **Bước 1 – Database**: đã chạy `supabase/migrations/20261117_google_calendar.sql` trong Supabase SQL Editor (bảng `google_connections`, `calendar_events` đã có). Môi trường khác (máy/DB của thành viên khác) phải tự chạy file này.
- [ ] **Bước 2 – Kết nối Google (backend)**: `npm i googleapis`; viết `src/services/googleCalendar.js` (OAuth client, dựng URL xin quyền, đổi code lấy token, refresh); thêm `src/routes/googleRoutes.js` đăng ký trong `src/routes/index.js`: `GET /api/google/connect`, `GET /api/google/callback`, `GET /api/google/status`, `PUT /api/google/settings` (công tắc auto sync), `DELETE /api/google/disconnect`.
- [ ] **Bước 3 – Service đồng bộ**: `syncWeek(employmentId, weekStart)` (xem "Thiết kế sync").
- [ ] **Bước 4 – Gắn vào các đường ghi lịch** (xem "Điểm phải gọi sync").
- [ ] **Bước 5 – Giao diện** `schedule.html`/`js/schedule.js`.
- [ ] **Bước 6 – Kiểm thử** (xem danh sách cuối mục).

### Quyết định đã chốt
- Một chiều, scope chỉ `https://www.googleapis.com/auth/calendar.events` (không dùng `.../auth/calendar` vì quá rộng). Danh sách scope trong console Google khó tìm: gõ `calendar.events` vào ô Filter hoặc dùng "Manually add scopes".
- Xin quyền với `access_type=offline` + `prompt=consent` để chắc chắn nhận **refresh token**. Token lưu **phía server** trong `google_connections`, không bao giờ trả về trình duyệt, không để ở `localStorage`.
- Công tắc nhân viên `auto_sync_manager_changes` (mặc định bật): khi chủ quán chỉnh lịch, server vẫn cập nhật calendar của nhân viên bằng refresh token đã lưu. Tắt thì chỉ sync khi chính nhân viên lưu. *(Đề xuất của người làm, nếu team muốn đổi hướng thì sửa mục này.)*
- Sync không được làm hỏng việc lưu lịch: DB là nguồn đúng; Google lỗi thì ghi `sync_status='error'` + `last_error`, không ném lỗi ra cho người dùng.

### Cấu trúc dữ liệu (`supabase/migrations/20261117_google_calendar.sql`)
- `google_connections(user_id uuid pk → auth.users, refresh_token, google_email, status 'active'|'revoked', auto_sync_manager_changes, last_error, connected_at, updated_at)`.
- `calendar_events(id, employment_id → employments, shift_id, week_start, weekday 0..6, google_event_id, payload_hash, sync_status 'synced'|'pending'|'error'|'deleted', last_error, updated_at)`, `unique (employment_id, shift_id, week_start, weekday)`.
- Cả hai bảng **bật RLS, không policy, thu hồi quyền anon/authenticated** → chỉ dùng được bằng client `admin` (`src/config/supabase.js`, secret key). Đây là ngoại lệ có chủ đích so với quy ước "mọi thao tác ghi đi qua client của user" ở `supabase.js`; chỉ dùng `admin` cho hai bảng này và đọc lịch phục vụ sync.
- Id vị trí/ca/nhân viên là **số (bigint)**, user là uuid.

### Thiết kế sync
1. Lịch hiện lưu theo ô `{shift_id, weekday}` của từng tuần (`week_start` = thứ Hai), qua RPC `save_schedule_exclusive` (xem `src/models/Employment.js`, `supabase/save-schedule-exclusive.sql`). Lưu = **thay thế cả tuần**, nên sync phải **so sánh**, không được chỉ "tạo event" (sẽ nhân đôi).
2. `syncWeek`: đọc các ô hiện tại của tuần → so với `calendar_events`:
   - ô mới → tạo event, lưu `google_event_id`;
   - ô không còn → xóa event, đánh dấu `deleted`;
   - ô còn nhưng giờ/tiêu đề đổi (so `payload_hash`) → cập nhật event.
3. Thời gian event: `ngày = week_start + weekday`; giờ lưu dạng thập phân (8.5 = 08:30, dùng chung một hàm đổi giờ, tham khảo `hh()` trong `public/js/schedule.js`); gửi `dateTime` kèm `timeZone: 'Asia/Ho_Chi_Minh'` (không dùng giờ máy chủ, server có thể chạy UTC). `end_hour = 24` → 00:00 ngày hôm sau; ca qua đêm (nếu có) cũng cộng thêm một ngày.
4. Tiêu đề event: `Tên quán – Vị trí (Tên ca)`. **Không đưa số điện thoại/thông tin liên hệ** của chủ quán vào event.
5. Lỗi cần xử lý: `invalid_grant` (token bị thu hồi/hết hạn 7 ngày khi app ở Testing) → đặt `status='revoked'`, giao diện hiện "Kết nối lại"; `404/410` khi cập nhật (người dùng tự xóa event) → tạo lại; `403 rateLimitExceeded`/`429` → retry có backoff; lưu lịch nhiều ô thì chạy nền, đừng bắt người dùng chờ Google.

### Điểm phải gọi sync (mọi đường làm đổi lịch của nhân viên)
- `PUT /api/employments/:id/schedule` (nhân viên lưu) – `src/routes/employmentRoutes.js`.
- `PUT /api/employments/:id/manage-schedule` (chủ quán chỉnh) – chỉ khi `auto_sync_manager_changes` bật.
- `DELETE /api/employments/:id` (chủ quán xóa nhân viên) → xóa các event còn lại.
- Sửa/lưu trữ ca khi chủ quán sửa tin: `src/services/positionEdit.js` (`editPosition`, đổi giờ ca, `shifts.archive`), vì làm đổi giờ của ô đã đăng ký.
- Nên gom về **một hàm sync dùng chung** gọi sau mọi đường ghi, đừng rải logic ở từng route.

### Giao diện (Bước 5)
- Trên `schedule.html`: khối nhỏ "Google Calendar" gồm nút **Kết nối** / **Ngắt kết nối** (nút phụ, **không** dùng `.btn-primary` – "Lưu lịch" mới là nút chính), công tắc tự cập nhật, trạng thái **bằng chữ** (Đã kết nối / Đang đồng bộ / Đồng bộ lỗi) bằng `.badge`.
- Lỗi đặt ngay tại chỗ (`.msg err`), không tự ẩn; token hỏng thì hiện nút "Kết nối lại". Không thêm màu/bo góc ngoài token; cần class mới thì thêm vào `style.css`.
- Dùng luồng redirect (không popup) cho OAuth.

### Cấu hình & lưu ý chạy thử
- Redirect URI phải khớp **từng ký tự** với Google Console: `http://localhost:3000/api/google/callback` (production thêm URI domain thật). Sai → `redirect_uri_mismatch`.
- App ở chế độ **Testing**: chỉ email trong **Test users** đăng nhập được, refresh token hết hạn sau 7 ngày. Thêm email thành viên team vào Test users. Lên production cần Google xác minh OAuth consent screen (cần privacy policy, domain).
- Nếu lộ client secret: Google Console → Credentials → **Reset secret**, rồi cập nhật `.env` của mọi người.
- Endpoint callback OAuth có thể bị `middlewares/rateLimit.js` ảnh hưởng, kiểm tra khi làm Bước 2.

### Kiểm thử (Bước 6)
- Lưu lịch hai lần liên tiếp → không nhân đôi event.
- Bỏ một ô rồi lưu → event bị xóa. Đổi giờ ca → event cập nhật.
- Ca có giờ lẻ (8:30) và ca kết thúc 24:00 → giờ đúng trên Google.
- Thu hồi quyền trong tài khoản Google rồi lưu lịch → lịch vẫn lưu được, giao diện báo cần kết nối lại.
- Chủ quán chỉnh lịch: công tắc bật → Google nhân viên đổi; tắt → không đổi.
- Xóa nhân viên khỏi việc → event biến mất.
