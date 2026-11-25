# web/ – giao diện Next.js (App Router)

Bản dựng lại giao diện `public/` bằng Next.js + React. Express (`../src`) vẫn là API; Next chuyển tiếp mọi `/api/*` sang đó.

## Chạy
```
npm run dev          # ở thư mục gốc: API Express, cổng 3000
npm run dev:web      # giao diện Next.js, cổng 3001  → http://localhost:3001
```
Đổi địa chỉ API: biến `API_URL` (mặc định `http://localhost:3000`). Build: `npm run build:web` (cần `npm --prefix web install` lần đầu).

## Cấu trúc
- `app/` mỗi thư mục là một route (`/jobs`, `/jobs/[id]`, `/candidates/[id]`…). `style.css` là bản sao của `public/css/style.css`; Tailwind giữ tiền tố `tw-`.
- `components/Page.jsx` thay `data-layout`: dựng header, thanh dưới và chặn theo vai trò (`require`, `isPublic`).
- `lib/auth.js` thay `public/js/auth.js` (phiên ở localStorage/sessionStorage, tự làm mới token).
- Đường dẫn không còn đuôi `.html`: `job-detail.html?id=1` → `/jobs/1`, `candidate-detail.html?id=` → `/candidates/<id>`.

## Chưa làm / lưu ý
- Chưa có SSR cho dữ liệu: các trang gọi API từ trình duyệt như bản cũ (token nằm ở localStorage nên server không đọc được).
- `public/` và các test của nó (`tests/`) vẫn là bản cũ, chưa gỡ.
