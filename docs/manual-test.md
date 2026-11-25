# Bảng test thủ công giao diện

Kết quả dưới đây do Claude chạy thật bằng Chrome trên bản triển khai, bằng cách thao tác DOM và đo bằng script. Ảnh chụp 3 kích thước (điện thoại 375px, tablet 768px, desktop 1280px) ở `docs/screenshots/test/`. Ca ghi **Chưa test** là chưa chạy.

**Môi trường:** Chrome, bản triển khai https://basic-web-rho.vercel.app. **Ngày test:** 25/11/2026 · **Người test:** Claude (phiên đăng nhập tài khoản người tìm việc do thành viên nhóm tự đăng nhập)

| # | Thành phần | Thao tác | Kết quả mong đợi | Thực tế | Đạt? |
|---|---|---|---|---|---|
| 1 | Hộp thoại dùng chung | Bấm nút có `data-todo` | Hiện hộp thoại "Tính năng chưa có sẵn" | Bản production không còn nút `data-todo` trên các trang đã mở | Chưa test |
| 2 | Hộp thoại | Nhấn Esc khi hộp thoại mở | Hộp thoại đóng | Không có hộp thoại để thử | Chưa test |
| 3 | Hộp thoại | Bấm vào nền tối | Hộp thoại đóng | Không có hộp thoại để thử | Chưa test |
| 4 | Đăng ký | Gửi form trống | Báo lỗi tại chỗ, không tự ẩn | Hiện một thông báo chung "Vui lòng điền đủ các ô bắt buộc", không chỉ ra từng ô | Đạt một phần |
| 5 | Đăng ký | Số điện thoại "0905 12" | Báo lỗi số điện thoại | "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0" | Đạt |
| 6 | Đăng ký | Mật khẩu "123" | Báo lỗi mật khẩu | "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số" | Đạt |
| 7 | Đăng ký | Email hoặc SĐT đã tồn tại | Báo trùng | Không chạy, vì phải gửi dữ liệu hợp lệ lên máy chủ | Chưa test |
| 8 | Đăng nhập | Sai mật khẩu | Báo lỗi tại form | Chưa chạy | Chưa test |
| 9 | Đăng nhập | Đúng thông tin | Chuyển tới trang theo vai trò | Thành viên nhóm tự đăng nhập; vào được `my-jobs.html` với tên người dùng ở header | Đạt |
| 10 | Hồ sơ | Xóa trường bắt buộc rồi lưu | Báo lỗi, không lưu | Chưa chạy (tránh sửa dữ liệu thật) | Chưa test |
| 11 | Tải ảnh | Chọn ảnh lớn | Ảnh được nén | Chưa chạy | Chưa test |
| 12 | Công việc của tôi | Bấm lần lượt 3 tab | Nội dung đổi, tab đang mở được đánh dấu | `aria-selected` chuyển đúng theo từng tab; nội dung đổi (Đã ứng tuyển, Lời mời, Đã lưu) | Đạt |
| 13 | Lịch tuần | Bấm một ô ca rồi bấm lại | Chọn rồi bỏ chọn, tổng giờ cập nhật | Chọn: "2 ca · 16 giờ"; bỏ chọn: "1 ca · 8 giờ"; `aria-pressed` đổi true/false | Đạt |
| 14 | Lịch tuần | Chọn ít hơn mức tối thiểu | Cảnh báo trước khi lưu | "Bạn đang chọn 16 giờ/tuần, thấp hơn mức tối thiểu 40 giờ…". Giới hạn tối đa mỗi ngày chưa thử | Đạt một phần |
| 15 | Lịch tuần | Bấm "Lưu lịch làm" | Lưu thành công, tải lại còn ca | Không chạy để không đổi lịch thật | Chưa test |
| 16 | Danh sách việc | Lọc, sắp xếp, tìm, phân trang | Danh sách đổi đúng | Lọc Online: 1 việc; Offline: 4; Tất cả: 5. "Lương cao nhất" sắp lại theo lương. Tìm "pha chế": 0 kết quả (dữ liệu không có việc phù hợp). Chỉ có 1 trang nên chưa thử phân trang | Đạt một phần |
| 17 | Responsive | Rộng 375px và ≥ 720px | Dưới 720px hiện thanh dưới, từ 720px ẩn | 375px: thanh dưới hiện, mục cao 53px (≥ 48). 768px, 1280px: ẩn. Chỉ có ở trang chủ và danh sách việc | Đạt |
| 18 | Responsive | Xem 5 trang ở 375, 768, 1280px | Không cuộn ngang | Không trang nào cuộn ngang. Ảnh: `screenshots/test/` (trang chủ, danh sách việc) | Đạt |
| 19 | Bàn phím | Tab qua form đăng nhập | Thứ tự hợp lý, thấy viền focus | Chưa chạy | Chưa test |

## Phát hiện cần sửa
- Form đăng ký chỉ có một thông báo lỗi chung ở đầu form, chưa báo từng ô (ca 4). Quy ước của dự án là đặt lỗi ngay tại ô người dùng thao tác.
- Cửa sổ trình duyệt điều khiển không đổi được viewport, nên responsive đo bằng Chrome headless (Puppeteer) trên các trang công khai.

Ghi chú: test tự động hiện có (`npm test`) chỉ kiểm phía server; bảng này là bằng chứng cho phần giao diện.
