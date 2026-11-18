# Kế hoạch dự án, phân công và wireframe

> Tài liệu này phục vụ **Task 1** (họp phân vai, wireframe, kế hoạch, quản lý GitHub).
> Các mục có dấu **[CẦN XÁC NHẬN]** do nhóm điền lại cho đúng thực tế (tên, ngày họp, link). Phần còn lại lấy từ lịch sử GitHub của repo.

## 1. Thành viên và phân công
Họp phân vai: **[CẦN XÁC NHẬN: ngày họp, hình thức, biên bản]**

| Thành viên (GitHub) | Vai trò | Phần đã làm (theo PR trong repo) |
|---|---|---|
| `letuanlocc` | Trưởng nhóm, backend và tích hợp | Dựng giao diện từ thiết kế (#1), nối giao diện với CSDL (#6, #7), tăng tốc API và xác minh JWT (#8, #9), tìm kiếm ứng viên bằng PhoBERT (#17), sửa tin tuyển (#24), xử lý ca trùng giờ (#28), lịch bận (#27), Google Calendar (#32) |
| `hadess-95` | Dữ liệu mẫu và tính năng nhà tuyển dụng | Dữ liệu mẫu CaRảnh (#3), hiển thị lương theo đơn vị (#10, #11), tìm ứng viên cho HR (#20), Google Calendar (#30) |
| `nguyenthanhtan16306-sudo` | Kiểm thử và sửa lỗi | Sửa danh sách việc và xếp ca độc quyền (#12), đợt test và fix (#13, #19), lỗi định dạng `week_start` (#26) |
| `AnhTai0307` | Đăng nhập, đăng ký | Đăng nhập, đăng ký (#2, #4, #5), kiểm tra trùng email và số điện thoại (#21) |
| `NguyenThanhTanTai` | Tính năng sửa tin | Sửa tin tuyển, giờ có phút, tải ảnh từ máy (#22) |

**[CẦN XÁC NHẬN]** Sửa bảng cho đúng tên thật và vai trò đã thống nhất trong buổi họp. Một số người dùng nhiều tài khoản Git (ví dụ `Hoang Bui Anh Tai` và `AnhTai0307`).

## 2. Wireframe và thiết kế giao diện
- Prototype thiết kế chuẩn của nhóm: xem mục *Nguồn thiết kế* trong [CLAUDE.md](../CLAUDE.md). **[CẦN XÁC NHẬN: dán link Figma/prototype công khai và ảnh wireframe vào đây]**
- Nhánh thiết kế trên GitHub: `design_interface`, `design_v2`.
- Hệ thống thiết kế (màu, font, bo góc, khoảng cách) mô tả trong [CLAUDE.md](../CLAUDE.md).

Luồng màn hình chính (20 trang trong [public/](../public/)):

| Nhóm | Trang |
|---|---|
| Khách | `index`, `jobs`, `job-detail`, `overview`, `login`, `register`, `forgot-password`, `reset-password` |
| Người tìm việc | `setup-seeker`, `profile`, `my-jobs`, `schedule`, `change-password` |
| Chủ quán | `setup-employer`, `shop`, `new-post`, `positions`, `candidates`, `candidate-detail`, `staff-schedule` |

## 3. Kế hoạch và mốc (5 sprint)
Thời gian môn học: 3 tuần. Repo có commit đầu ngày **2026-11-09**. **[CẦN XÁC NHẬN: ngày bắt đầu và kết thúc từng sprint theo kế hoạch ban đầu]**

| Sprint | Mục tiêu | Kết quả bàn giao | Trạng thái |
|---|---|---|---|
| 1 | Lập nhóm, wireframe, dựng repo, thiết kế CSDL | Wireframe, schema, repo và nhánh `develop` | Hoàn thành (PR #1) |
| 2 | Giao diện nhiều trang, đăng nhập, đăng ký, nối CSDL | 20 trang HTML/CSS/JS, API xác thực, dữ liệu mẫu | Hoàn thành (PR #2 đến #8) |
| 3 | Chức năng cốt lõi: đăng tin, ứng tuyển, xếp lịch làm | Tin tuyển, ứng tuyển, lịch theo ca, tìm ứng viên | Hoàn thành (PR #9 đến #28) |
| 4 | Tích hợp ngoài và tối ưu | Google Calendar, Sentry, Google Analytics, Lighthouse | Đang thực hiện (PR #30 đến #33 và nhánh mới) |
| 5 | Peer review và hoàn thiện | Phản hồi từ ít nhất 2 nhóm khác, áp dụng phản hồi, README, video demo | **[CẦN XÁC NHẬN]** |

## 4. Quản lý GitHub
- **Nhánh:** `main` (ổn định) ← `develop` (tích hợp) ← `feature/...`, `fix/...` (mỗi việc một nhánh).
- **Quy trình:** mở nhánh từ `develop` → commit nhỏ → Pull Request vào `develop` → review → merge. Từ `develop` mở PR vào `main` khi hoàn thành sprint.
- **Commit message:** `loại: nội dung ngắn`, trong đó loại là `feat`, `fix`, `docs`, `test`, `refactor`. Mỗi commit một thay đổi hợp lý.
- **Ticket:** dùng GitHub Issues cho từng việc, và ghi `Closes #N` trong mô tả PR để liên kết. **[CẦN BỔ SUNG]** hiện repo mới có 2 issue (#16, #29); nên tạo issue cho các tính năng đã làm và liên kết PR tương ứng.

## 5. Phản hồi từ nhóm khác (Task 5)
| Nhóm review | Phản hồi nhận được | Đã áp dụng? | Lý do / thay đổi |
|---|---|---|---|
| **[CẦN XÁC NHẬN]** | | | |
| **[CẦN XÁC NHẬN]** | | | |

Nhóm tự review ít nhất 2 dự án khác: **[CẦN XÁC NHẬN: tên nhóm, link báo cáo]**.
