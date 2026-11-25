# Báo cáo Lighthouse các trang chính

Đo ngày 25/11/2026 bằng Lighthouse CLI 12.8.2 (Chrome headless) trên bản triển khai https://basic-web-rho.vercel.app. Mỗi trang đo hai lần: desktop (`--preset=desktop`) và mobile (mặc định). Báo cáo đầy đủ là các file `*-2026-11-25.html` cùng thư mục (tải về rồi mở bằng trình duyệt).

| Trang | Thiết bị | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Trang chủ `/` | Desktop | 95 | 98 | 100 | 100 | 1,0 s | 1,1 s | 0 ms | 0,084 |
| Trang chủ `/` | Mobile | 79 | 98 | 100 | 100 | 2,6 s | 3,2 s | 430 ms | 0 |
| Danh sách việc `/jobs.html` | Desktop | 95 | 98 | 100 | 100 | 0,9 s | 1,0 s | 0 ms | 0,089 |
| Danh sách việc `/jobs.html` | Mobile | 88 | 98 | 100 | 100 | 2,7 s | 3,1 s | 130 ms | 0 |
| Chi tiết việc `/job-detail.html?id=14` | Desktop | 99 | 100 | 100 | 100 | 0,8 s | 0,8 s | 0 ms | 0,005 |
| Chi tiết việc `/job-detail.html?id=14` | Mobile | 94 | 100 | 100 | 100 | 2,4 s | 2,4 s | 50 ms | 0 |
| Giới thiệu `/overview.html` | Desktop | 98 | 100 | 100 | 100 | 0,9 s | 1,0 s | 0 ms | 0,001 |
| Giới thiệu `/overview.html` | Mobile | 89 | 100 | 100 | 100 | 2,6 s | 3,2 s | 110 ms | 0 |

## Nhận xét
- Điểm Performance trên mobile thấp hơn desktop vì Lighthouse mô phỏng CPU chậm 4× và mạng 4G chậm. Trang chủ mobile thấp nhất (79) do TBT 430 ms.
- CLS desktop của trang chủ và danh sách việc còn ~0,085 (vẫn trong ngưỡng "tốt" < 0,1) do danh sách việc nạp từ API rồi mới dựng.
- Hướng cải thiện tiếp: giảm JS chạy lúc tải trang chủ trên mobile (TBT), chừa chiều cao cho danh sách việc.

## Chưa đo (cần đăng nhập)
Tìm ứng viên (`candidates.html`) và lịch làm (`schedule.html`) cần tài khoản nên Lighthouse CLI không đo được. Cách đo: đăng nhập trên Chrome, mở trang, DevTools → Lighthouse, **bỏ chọn "Clear storage"**, chạy rồi lưu báo cáo/ảnh vào thư mục này và bổ sung hai dòng vào bảng trên.
