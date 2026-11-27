# Góp ý nhận được và cách xử lý

> Chỉ ghi góp ý thật nhận được từ nhóm khác.

| Góp ý (link issue) | Nhóm góp ý | Quyết định (làm / không làm) | Lý do | PR / commit |
|---|---|---|---|---|
| [#77](https://github.com/letuanlocc/basic_web/issues/77) – proxy API sang bản cũ, trang `'use client'`, thiếu Giới thiệu/Liên hệ, hai giao diện song song, README thiếu video | Nhóm 2 (Remi) | Làm mục 2 (phần công khai) và mục 5; không làm mục 1, 3, 4 | Mục 2: đã chuyển `/jobs` và `/jobs/[id]` sang Server Component đọc trực tiếp Supabase; các trang cần phiên đăng nhập giữ `'use client'`. Mục 5: xóa dòng "CẦN BỔ SUNG" trong README. Mục 1, 3, 4: giữ một backend Express để logic và test ở một nơi; tập trung luồng chính; README đã ghi bản Next.js là bản chính | [#81](https://github.com/letuanlocc/basic_web/pull/81), [#88](https://github.com/letuanlocc/basic_web/pull/88) |
| [#83](https://github.com/letuanlocc/basic_web/issues/83) – 10 mục UI/UX trên bản Next.js | Nhóm 1 (NutriVN) | Làm mục 1, 2, 4, 6, 8, 9; không làm mục 3, 5, 7, 10 | Làm: thẻ mẫu ở `/overview`, bỏ link xem trước ở `/register`, khách xem được `/jobs/[id]`, bỏ nhãn "Prototype" ở chân trang, ẩn dòng "chưa lọc được" khi tìm kiếm, sửa link video. Không làm: mục 3 cần đổi cấu hình Vercel và Google OAuth sát hạn; mục 5, 7, 10 là dọn code hoặc thay đổi nhỏ, ưu tiên thấp | [#85](https://github.com/letuanlocc/basic_web/pull/85) |
