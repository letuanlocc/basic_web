# Bảng test thủ công giao diện

Người test điền cột **Thực tế** và **Đạt?** khi chạy, rồi đính ảnh chụp 3 kích thước vào `docs/screenshots/test/` (điện thoại 375px, tablet 768px, desktop 1280px).

**Môi trường:** Chrome, bản triển khai https://basic-web-rho.vercel.app hoặc `npm run dev`. **Ngày test:** [điền] · **Người test:** [điền]

| # | Thành phần | Thao tác | Kết quả mong đợi | Thực tế | Đạt? |
|---|---|---|---|---|---|
| 1 | Hộp thoại dùng chung | Bấm nút có `data-todo` | Hiện hộp thoại "Tính năng chưa có sẵn" | | |
| 2 | Hộp thoại | Nhấn Esc khi hộp thoại mở | Hộp thoại đóng | | |
| 3 | Hộp thoại | Bấm vào nền tối ngoài hộp | Hộp thoại đóng | | |
| 4 | Đăng ký | Gửi form trống | Báo lỗi ngay tại từng ô bắt buộc, không tự ẩn | | |
| 5 | Đăng ký | Nhập số điện thoại sai định dạng | Báo lỗi số điện thoại tại ô | | |
| 6 | Đăng ký | Mật khẩu ngắn | Báo lỗi mật khẩu tại ô | | |
| 7 | Đăng ký | Email hoặc SĐT đã tồn tại | Báo trùng tại ô tương ứng | | |
| 8 | Đăng nhập | Sai mật khẩu | Báo lỗi tại form | | |
| 9 | Đăng nhập | Đúng thông tin | Chuyển tới trang theo vai trò | | |
| 10 | Hồ sơ | Xóa trường bắt buộc rồi lưu | Báo lỗi tại ô, không lưu | | |
| 11 | Tải ảnh | Chọn ảnh lớn | Ảnh được nén, xem trước hiển thị | | |
| 12 | Công việc của tôi | Bấm lần lượt các tab | Nội dung đổi theo tab, tab đang mở được đánh dấu | | |
| 13 | Lịch tuần | Bấm một ô ca | Ô được chọn/bỏ chọn, tổng giờ cập nhật | | |
| 14 | Lịch tuần | Chọn vượt giới hạn giờ/ngày | Cảnh báo trước khi lưu | | |
| 15 | Lịch tuần | Bấm "Lưu lịch" | Báo lưu thành công; tải lại vẫn còn ca | | |
| 16 | Danh sách việc | Tìm từ khóa, lọc online/offline, đổi sắp xếp, sang trang 2 | Danh sách đổi đúng | | |
| 17 | Responsive | Thu cửa sổ dưới 720px | Menu trên ẩn, hiện thanh điều hướng dưới (mục cao ≥ 48px) | | |
| 18 | Responsive | Xem ở 768px và 1280px | Bố cục 2 cột/lưới co giãn, không cuộn ngang | | |
| 19 | Bàn phím | Tab qua form đăng nhập | Thứ tự hợp lý, thấy rõ viền focus | | |

Ghi chú: test tự động hiện có (`npm test`) chỉ kiểm phía server; bảng này là bằng chứng cho phần giao diện.
