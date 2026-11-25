# Kế hoạch dự án CaRảnh

## Phạm vi
Nền tảng việc làm part-time: chủ quán đăng tin tuyển và xếp ca; người tìm việc ứng tuyển, đăng ký ca và đồng bộ lịch sang Google Calendar. Chi tiết tính năng: [README](../README.md).

**Sản phẩm bàn giao:** web triển khai trên Vercel, mã nguồn GitHub, README (ERD, ảnh chụp, báo cáo tối ưu), video demo ≤ 10 phút.

## Vai trò và trách nhiệm
Thông tin dưới đây rút từ lịch sử commit. **Cả nhóm cần rà lại và sửa cột "Vai trò" cho đúng trước khi nộp.**

| Thành viên | GitHub | Phụ trách (theo commit) |
|---|---|---|
| Lê Tuấn Lộc | letuanlocc | Nhóm trưởng; kiến trúc backend Express, giao diện và Tailwind, tối ưu Lighthouse, Sentry/GA4, Next.js, tài liệu |
| Nguyễn Thanh Tấn Tài | NguyenThanhTanTai, nguyenthanhtan16306-sudo | Lịch làm theo ca, chủ quán chỉnh lịch, giới hạn giờ, sửa tin tuyển |
| Nguyễn Tuấn Tài (Hades) | hadess-95 | Tích hợp Google Calendar, tìm ứng viên, đơn vị lương, test |
| Hoàng Bùi Anh Tài | AnhTai0307 | Đăng nhập, đăng ký, hồ sơ, kiểm tra trùng email/SĐT |

## Cột mốc (milestone)
Ngày được tính theo hạn nộp bài; chỉnh nếu giảng viên công bố ngày khác.

| Mốc | Hạn | Nội dung | Trạng thái |
|---|---|---|---|
| M1 – Thiết kế | 06/11/2026 | Wireframe/prototype, token thiết kế, schema CSDL | Xong |
| M2 – Chức năng lõi | 13/11/2026 | Đăng nhập, hồ sơ, đăng tin, ứng tuyển, lịch làm | Xong |
| M3 – Tích hợp | 20/11/2026 | Google Calendar, tìm ứng viên, seeder | Xong |
| M4 – Tối ưu & theo dõi | 24/11/2026 | Lighthouse, Sentry, GA4, Next.js | Xong |
| M5 – Hoàn thiện nộp bài | 01/12/2026 | Góp ý chéo (Task 5), bảng test, video demo | Đang làm |

## Quy trình làm việc
- Mỗi việc có một issue (nhãn + người nhận + milestone) → nhánh `feature/...` hoặc `fix/...` → Pull Request ghi `Closes #n` → review → merge vào `develop`/`main`. Mẫu issue/PR ở thư mục [.github/](../.github/).
- Commit theo dạng `feat:`, `fix:`, `docs:`, `test:`, `perf:`, một commit một việc.

## Biên bản họp
Điền sau mỗi buổi họp (mẫu ở [meeting-notes.md](meeting-notes.md)).

## Issue theo dõi
Việc còn lại của M5 nằm trong GitHub Issues (có nhãn, người nhận, milestone): [danh sách issue mở](https://github.com/letuanlocc/basic_web/issues). Issue #16 (sửa tin tuyển) và #29 (Google Calendar) thuộc M2 và M3.
