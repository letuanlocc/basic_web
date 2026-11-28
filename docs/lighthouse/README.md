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
| [Tìm ứng viên `/candidates.html`](candidates-desktop-2026-11-26.html) | Desktop | 100 | 98 | 96 | 100 | 0,4 s | 0,5 s | 30 ms | 0,014 |
| [Lịch làm `/schedule.html`](schedule-desktop-2026-11-26.html) | Desktop | 100 | 100 | 96 | 100 | 0,3 s | 0,4 s | 30 ms | 0,019 |

## Nhận xét
- Điểm Performance trên mobile thấp hơn desktop vì Lighthouse mô phỏng CPU chậm 4× và mạng 4G chậm. Trang chủ mobile thấp nhất (79) do TBT 430 ms.
- CLS desktop của trang chủ và danh sách việc còn ~0,085 (vẫn trong ngưỡng "tốt" < 0,1) do danh sách việc nạp từ API rồi mới dựng.
- Hướng cải thiện tiếp: giảm JS chạy lúc tải trang chủ trên mobile (TBT), chừa chiều cao cho danh sách việc.

## Hai trang cần đăng nhập

Đo ngày 26/11/2026 trên cùng bản triển khai bằng Lighthouse 12.8.2 và Chrome 158 ở chế độ desktop. Dùng tài khoản demo chủ quán để đo Tìm ứng viên và tài khoản demo người tìm việc để đo Lịch làm. Lighthouse giữ phiên với `disableStorageReset: true`, tương đương bỏ chọn **Clear storage** trong DevTools.

Đã kiểm tra đúng URL, danh sách ứng viên và lưới ca tải thành công. Hai báo cáo HTML lược bỏ ảnh chụp và đoạn HTML của các phần tử để tránh lưu thông tin hiển thị trong phiên đăng nhập. Bảng dùng giá trị đã làm tròn theo cách Lighthouse hiển thị.

## Bản Next.js (bản chính)
Đo ngày 26/11/2026 trên https://basic-web-verson2.vercel.app, cùng cách đo như trên. Báo cáo đầy đủ: các file `next-*-2026-11-26.html` cùng thư mục.

| Trang | Thiết bị | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Trang chủ `/` | Desktop | 96 | 98 | 100 | 100 | 0,6 s | 1,1 s | 0 ms | 0,084 |
| Trang chủ `/` | Mobile | 84 | 98 | 100 | 100 | 2,5 s | 3,9 s | 40 ms | 0 |
| Danh sách việc `/jobs` | Desktop | 96 | 98 | 100 | 100 | 1,0 s | 1,2 s | 0 ms | 0,013 |
| Danh sách việc `/jobs` | Mobile | 71 | 98 | 100 | 100 | 3,1 s | 3,9 s | 440 ms | 0 |
| Giới thiệu `/overview` | Desktop | 98 | 100 | 100 | 100 | 0,9 s | 1,0 s | 10 ms | 0,001 |
| Giới thiệu `/overview` | Mobile | 75 | 100 | 100 | 100 | 1,7 s | 3,5 s | 620 ms | 0 |

Nhận xét: desktop đều 96 đến 98. Mobile thấp ở danh sách việc (71) và giới thiệu (75) do TBT 440 và 620 ms (JavaScript của React chạy lúc tải). Hướng cải thiện: giảm JS chạy lúc tải, tách mã theo trang.

### Đo lại Chi tiết việc, Tìm ứng viên và Lịch làm

Ngày 28/11/2026, đo trên bản Next.js tại https://basic-web-verson2.vercel.app bằng Chrome 158, DevTools Lighthouse 13.5.0, chế độ Navigation. Hai báo cáo Chi tiết việc ngày 26/11 có URL cuối là `/login` và đã được loại khỏi bảng. Lượt đo mới dùng cùng tin đang mở tại `/jobs/5` cho Desktop và Mobile, với tên tin đã hiển thị.

Với `/candidates`, dùng tài khoản demo chủ quán và xác nhận danh sách ứng viên tải thành công. Với `/schedule`, dùng tài khoản demo người tìm việc và xác nhận lưới ca đã hiện. Cả bốn lượt đo sau đăng nhập bỏ chọn **Clear storage**. Các báo cáo của hai trang này đã lược bỏ ảnh chụp và đoạn HTML có thể chứa thông tin trong phiên đăng nhập.

| Trang | Thiết bị | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| [Chi tiết việc `/jobs/5`](next-job-detail-desktop-2026-11-28.html) | Desktop | 79 | 100 | 100 | 100 | 0,5 s | 0,9 s | 0 ms | 0,464 |
| [Chi tiết việc `/jobs/5`](next-job-detail-mobile-2026-11-28.html) | Mobile | 91 | 100 | 100 | 100 | 1,6 s | 3,0 s | 160 ms | 0 |
| [Tìm ứng viên `/candidates`](next-candidates-desktop-2026-11-28.html) | Desktop | 99 | 98 | 100 | 100 | 0,3 s | 0,3 s | 0 ms | 0,079 |
| [Tìm ứng viên `/candidates`](next-candidates-mobile-2026-11-28.html) | Mobile | 91 | 98 | 100 | 100 | 0,8 s | 1,1 s | 380 ms | 0,001 |
| [Lịch làm `/schedule`](next-schedule-desktop-2026-11-28.html) | Desktop | 99 | 100 | 100 | 100 | 0,3 s | 0,6 s | 0 ms | 0,076 |
| [Lịch làm `/schedule`](next-schedule-mobile-2026-11-28.html) | Mobile | 96 | 100 | 100 | 100 | 0,8 s | 1,0 s | 130 ms | 0,098 |

- Lượt đo Chi tiết việc trên Desktop ghi nhận CLS 0,464. Lighthouse chỉ ra web font trong nhóm nguyên nhân dịch chuyển bố cục của khối nội dung. Thay đổi cách tải font dùng chung cần được kiểm tra trên các trang dùng chung header.
- Hai lượt đo Tìm ứng viên cùng báo `heading-order`. Bản sửa đặt một H1 cho trang, hai H2 cho bộ lọc và kết quả, rồi giữ H3 cho từng thẻ ứng viên.

#### Kiểm chứng bản sửa heading trên Tìm ứng viên

Đo lại `/candidates` trên bản production build cục bộ của commit `aa8adac` bằng Lighthouse 13.5.0, theo cùng hai chế độ thiết bị và giữ phiên tài khoản demo. Hai lượt đo đều đạt audit `heading-order` và Accessibility 100. Dùng kết quả này để kiểm chứng lỗi heading, vì môi trường đo cục bộ khác production.

| Thiết bị | Audit heading trên production trước sửa | Audit heading trên bản sửa | Báo cáo bản sửa |
|---|---|---|---|
| Desktop | Chưa đạt | Đạt | [HTML Desktop](next-candidates-after-local-desktop-2026-11-28.html) |
| Mobile | Chưa đạt | Đạt | [HTML Mobile](next-candidates-after-local-mobile-2026-11-28.html) |
