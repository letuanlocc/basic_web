# CaRảnh – nền tảng việc làm part-time

CaRảnh kết nối **chủ quán** (đăng tin tuyển, xếp ca) với **người tìm việc** (ứng tuyển, đăng ký ca làm, đồng bộ lịch sang Google Calendar).

- **Backend:** Node.js + Express, dữ liệu và đăng nhập trên Supabase (Postgres + Auth).
- **Giao diện:** HTML/CSS/JS thuần trong `public/`, không dùng framework.
- **Tìm ứng viên bằng ngôn ngữ tự nhiên (tùy chọn):** dịch vụ Python NER trong `ner-service/`.

> Quy ước giao diện, token thiết kế và tiến độ tích hợp Google Calendar nằm trong [CLAUDE.md](CLAUDE.md). Đọc file đó trước khi sửa giao diện.

## Tính năng chính

**Người tìm việc**
- Đăng ký, đăng nhập, hoàn thiện hồ sơ, đổi hoặc quên mật khẩu.
- Xem và lưu tin tuyển, ứng tuyển, nhận lời mời.
- Đăng ký lịch làm theo tuần (chọn ca theo ngày), báo bận theo ca, hệ thống chặn ca đã đủ người hoặc trùng giờ với việc khác.
- Kết nối **Google Calendar** để ca đã đăng ký tự hiện trên lịch cá nhân (một chiều: CaRảnh → Google).

**Chủ quán**
- Tạo quán, đăng và sửa tin tuyển (ca làm, lương, số người mỗi ca).
- Xem hồ sơ ứng viên, mời ứng viên, tìm ứng viên theo từ khóa và khung giờ rảnh.
- Xem và chỉnh lịch ca của từng nhân viên, xóa nhân viên khỏi danh sách.

## Cấu trúc thư mục

```
server.js            Điểm khởi động (đọc .env, mở cổng)
src/
  app.js             Cấu hình Express (helmet, cors, rate limit, static)
  config/            Khởi tạo client Supabase (anon / theo người dùng / admin)
  routes/            Các nhóm API: auth, me, positions, shifts, applications,
                     seekers, invitations, employments, google
  models/            Truy cập dữ liệu Supabase
  services/          Logic nghiệp vụ: sửa tin tuyển, Google Calendar, đồng bộ lịch
  middlewares/       Xác thực, phân quyền, validate, rate limit, xử lý lỗi
  utils/             Quy tắc vị trí, tìm ứng viên, NER, ảnh…
public/              Giao diện tĩnh (mỗi màn hình là một file .html) + css/ + js/
supabase/            Script SQL (hàm RPC, migration) chạy trong Supabase SQL Editor
ner-service/         Dịch vụ Python NER cho thanh tìm kiếm (tùy chọn)
tests/               Test (node:test)
docs/                Tài liệu tính năng
```

## Yêu cầu

- Node.js 18 trở lên
- Một project Supabase
- (Tùy chọn) Tài khoản Google Cloud nếu dùng Google Calendar
- (Tùy chọn) Python 3 nếu chạy `ner-service`

## Chạy trên máy

```bash
git clone https://github.com/letuanlocc/basic_web.git
cd basic_web
npm install
cp .env.example .env      # rồi điền giá trị thật
npm run dev               # http://localhost:3000
```

Nếu báo `EADDRINUSE` nghĩa là cổng 3000 đang bị chiếm.

Kiểm tra server sống: `GET /api/health` trả `{ "success": true, "status": "ok" }`.

### Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `PORT` | Không | Cổng chạy server (mặc định 3000) |
| `SUPABASE_URL` | Có | URL project Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Có | Khóa công khai (publishable) |
| `SUPABASE_SECRET_KEY` | Có | Khóa bí mật, **chỉ dùng ở server** |
| `SUPABASE_JWKS_URL` | Có | URL JWKS để xác minh token |
| `GOOGLE_CLIENT_ID` | Khi dùng Google Calendar | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Khi dùng Google Calendar | OAuth Client secret, **không commit** |
| `GOOGLE_REDIRECT_URI` | Khi dùng Google Calendar | `https://<domain>/api/google/callback` (local: `http://localhost:3000/api/google/callback`) |
| `TRUST_PROXY` | Khi chạy sau proxy (Vercel…) | Đặt `1` để nhận đúng IP và giao thức HTTPS |
| `CORS_ORIGIN` | Không | Danh sách origin được phép, phân tách bằng dấu phẩy (mặc định tắt CORS) |
| `NER_SERVICE_URL` | Không | Địa chỉ dịch vụ NER; bỏ trống thì tìm ứng viên theo từ khóa thường |

Không bao giờ commit `.env`. File đã nằm trong `.gitignore`.

## Cơ sở dữ liệu

Các script SQL nằm trong `supabase/`. Chạy trong **Supabase SQL Editor** (role `postgres`) **trước khi** chạy code tương ứng:

- `supabase/migrations/` – migration theo ngày (đổi kiểu giờ có phút, bảng Google Calendar…).
- `supabase/save-schedule-exclusive.sql`, `manage-schedule.sql`, `schedule-conflicts.sql` – hàm RPC lưu lịch, chủ quán chỉnh lịch, kiểm tra trùng ca.

Hai bảng `google_connections` và `calendar_events` đã bật RLS và khóa quyền anon/authenticated: chỉ server (khóa `SUPABASE_SECRET_KEY`) đọc, ghi được, nên refresh token không lộ ra trình duyệt.

## Tích hợp Google Calendar

Một chiều: khi nhân viên lưu lịch làm, các ca xuất hiện trên Google Calendar đúng ngày và khung giờ (múi giờ `Asia/Ho_Chi_Minh`).

1. **Google Cloud Console:** tạo project, bật *Google Calendar API*, cấu hình OAuth consent screen (thêm email thử vào *Test users* khi app ở chế độ Testing), tạo *OAuth client* loại Web application.
2. Thêm `…/api/google/callback` vào **Authorized redirect URIs** cho từng domain (local và production). Phải khớp từng ký tự, không dùng wildcard.
3. Scope chỉ cần `https://www.googleapis.com/auth/calendar.events`.
4. Điền ba biến `GOOGLE_*` và chạy migration `20261117_google_calendar.sql`.
5. Trên trang *Lịch làm*, bấm **Kết nối Google Calendar**.

Lưu ý khi chạy thật:
- App ở chế độ Testing: chỉ email trong *Test users* kết nối được, và refresh token hết hạn sau 7 ngày. Lên production cần Google xác minh.
- Việc đồng bộ chạy nền sau khi trả response; trên Vercel dùng `waitUntil` (`@vercel/functions`) để không bị cắt.
- Ứng dụng Google Calendar trên điện thoại có thể cập nhật chậm hơn web, kéo để làm mới.

Chi tiết thiết kế và các tình huống lỗi xem mục *Tích hợp Google Calendar* trong [CLAUDE.md](CLAUDE.md).

## Dịch vụ NER (tùy chọn)

`ner-service/` là dịch vụ FastAPI bọc model PhoBERT NER, giúp thanh tìm ứng viên hiểu từ khóa (kỹ năng, thời gian, địa điểm). Cần tải checkpoint và VnCoreNLP theo hướng dẫn trong [ner-service/README.md](ner-service/README.md), sau đó đặt `NER_SERVICE_URL` trỏ tới dịch vụ.

## Kiểm thử

```bash
node --test tests/
```

## Triển khai (Vercel)

1. Kết nối repo với Vercel.
2. Khai báo biến môi trường ở **Settings → Environment Variables** (cả `TRUST_PROXY=1` và ba biến `GOOGLE_*` với `GOOGLE_REDIRECT_URI` là domain Vercel).
3. Thêm domain Vercel vào Authorized redirect URIs của Google.
4. **Redeploy** sau mỗi lần đổi biến môi trường, vì biến chỉ áp dụng cho deployment mới.
5. Nên đặt vùng chạy của function gần vùng Supabase (Settings → Functions → Region) để giảm độ trễ.

## Quy trình làm việc

- Nhánh chính: `main`; nhánh phát triển: `develop`; làm tính năng ở `feature/...` rồi mở PR vào `develop`.
- Giao diện mới phải theo token và quy ước trong [CLAUDE.md](CLAUDE.md): một màu chủ đạo, mỗi màn chỉ một nút chính, văn bản tiếng Việt.
