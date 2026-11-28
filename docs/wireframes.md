# Wireframe và thiết kế giao diện

Prototype gốc (design system + 9 màn hình mẫu) được xuất ra PDF và ảnh để xem trực tiếp trong repo: [wireframes/prototype.pdf](wireframes/prototype.pdf). Token màu, chữ, bo góc, khoảng cách cũng ghi trong [CLAUDE.md](../CLAUDE.md).

- **Công cụ thiết kế:**
  - Màn hình `1–10`: Claude Artifact Prototype ([file gốc](https://claude.ai/code/artifact/326c6282-8ae5-4a1d-bb3f-429e730b823c), bản PDF lưu tại [wireframes/prototype.pdf](wireframes/prototype.pdf)).
  - Màn hình `11–14`: Dựng trực tiếp theo bộ Design System CaRảnh bằng script Python (`Pillow`) và xuất ảnh PNG vào `docs/wireframes/`.

| # | Màn hình | Wireframe | Giao diện đã dựng (ảnh chụp) |
|---|---|---|---|
| 1 | Design system (màu, chữ, nút, thẻ, thông báo, điều hướng mobile) | [ảnh](wireframes/01-design-system.png) | – |
| 2 | Trang chủ, danh sách việc (mobile) | [ảnh](wireframes/02-home-mobile.png) | [mobile.png](screenshots/mobile.png) |
| 3 | Trang chủ, danh sách việc (desktop) | [ảnh](wireframes/03-home-desktop.png) | [home.png](screenshots/home.png) |
| 4 | Đăng nhập | [ảnh](wireframes/04-login.png) | – |
| 5 | Đăng ký (bước 1) | [ảnh](wireframes/05-register.png) | – |
| 6 | Hồ sơ người tìm việc (bước 2) | [ảnh](wireframes/06-profile-seeker.png) | – |
| 7 | Hồ sơ nhà tuyển dụng (bước 2) | [ảnh](wireframes/07-profile-employer.png) | – |
| 8 | Trang giới thiệu | [ảnh](wireframes/08-landing.png) | – |
| 9 | Việc làm dành cho người tìm việc | [ảnh](wireframes/09-jobs-seeker.png) | [job-detail.png](screenshots/job-detail.png) |
| 10 | Tìm ứng viên (chủ quán) | [ảnh](wireframes/10-candidates-employer.png) | [candidates.png](screenshots/candidates.png) |
| 11 | Đăng tin tuyển (chủ quán) | [ảnh](wireframes/11-new-post.png) | [new-post.png](screenshots/new-post.png) |
| 12 | Đăng ký lịch làm theo tuần (người tìm việc) | [ảnh](wireframes/12-schedule-seeker.png) | [schedule.png](screenshots/schedule.png) |
| 13 | Chi tiết việc làm | [ảnh](wireframes/13-job-detail.png) | [job-detail.png](screenshots/job-detail.png) |
| 14 | Lịch làm của nhân viên (chủ quán) | [ảnh](wireframes/14-staff-schedule-employer.png) | – |

Các trang còn lại dựng theo cùng design system ở mục 1.

## Việc cần làm tay
- [x] Ghi buổi nhóm duyệt/chốt wireframe vào [meeting-notes.md](meeting-notes.md) (buổi 09/11/2026).
- [x] Thêm wireframe cho các trang còn thiếu: đăng tin tuyển, đăng ký lịch làm theo tuần, chi tiết việc, lịch nhân viên.
