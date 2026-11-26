# Góp ý đã gửi cho nhóm khác

> Chỉ ghi góp ý thật đã đăng. Mỗi nhóm cần: ưu điểm, vấn đề, đề xuất.

## Nhóm 1 – [NutriVN](https://github.com/Tl4826/Myproject)

- **Issue đã đăng** [Tl4826/Myproject#38](https://github.com/Tl4826/Myproject/issues/38)
- **Phạm vi kiểm tra** Bản triển khai ngày 26/11/2026, từ trang chủ đến đăng ký và đăng nhập, trên Chromium ở 1440 × 900 và 375 × 812. Phần quét ảnh và nhật ký sau đăng nhập chưa được kiểm tra. [Bản triển khai](https://nutrivn-myproject.vercel.app/)
- **Ưu điểm** Trang chủ nêu rõ mục đích, nút bắt đầu dẫn đúng đến đăng ký. Ở chiều rộng 375 px, form hiển thị đủ các trường và nút chính. Form trống đưa focus về trường bắt buộc đầu tiên.
- **Vấn đề UI/UX** Các nút Google và Facebook báo lỗi cấu hình. Liên kết Quên mật khẩu chưa mở luồng khôi phục. Nhãn ô nhập biến mất khi điền giá trị.
- **Đề xuất cải thiện** Chỉ hiện phương thức đăng nhập khả dụng, hướng người dùng về email khi xảy ra lỗi, nối liên kết với luồng đặt lại mật khẩu và dùng nhãn hiển thị cố định cho từng trường.
- **Ảnh kiểm tra** [Google](nutrivn/mobile-google.png) · [Facebook](nutrivn/mobile-facebook.png) · [Quên mật khẩu](nutrivn/mobile-forgot-password.png) · [Nhãn ô nhập](nutrivn/desktop-form-field-labels.png)

## Nhóm 2 – [Remi](https://github.com/Kaiser-2504/Project_Remi)

- **Issue đã đăng** [Kaiser-2504/Project_Remi#55](https://github.com/Kaiser-2504/Project_Remi/issues/55)
- **Phạm vi kiểm tra** Bản triển khai ngày 26/11/2026: trang chủ (Hôm nay), form tạo tài khoản, thanh điều hướng và thẻ ngủ/thức dậy, ở khung điện thoại và máy tính. Đối chiếu thêm mã giao diện trong repo (`web/index.html`, `web/js/app.js`). [Bản triển khai](https://project-remi.vercel.app)
- **Ưu điểm** Bố cục tự đổi theo màn hình (thanh dưới trên điện thoại, thanh bên và 2 cột trên máy tính). Chip "Gợi ý cho bạn" tạo việc nhanh không cần gõ. Form tạo tài khoản gọn, có nhãn rõ và lối tắt sang đăng nhập. Trang cho phép phóng to.
- **Vấn đề UI/UX** Ô mật khẩu không có nút hiện/ẩn và chỉ báo yêu cầu 8 ký tự sau khi bấm gửi. Ô nhập AI không có chữ gợi ý nên nút "Thêm" không rõ tạo ra gì. Tab "Lịch" và nút "Hẹn lịch" trùng nghĩa. Thanh dưới 6 tab chật, "Lịch" và "Sắp tới" gần cùng icon. Thanh trượt ngủ/thức dậy phải kéo mới đổi được, chạm một lần không có tác dụng, và giờ ngủ/dậy không xem được cùng lịch trong ngày.
- **Đề xuất cải thiện** Thêm nút con mắt và dòng "Tối thiểu 8 ký tự" dưới ô mật khẩu. Thêm chữ gợi ý cho ô nhập và đổi "Thêm" thành nhãn cụ thể. Đổi tên "Hẹn lịch" hoặc gộp vào tab "Lịch". Đổi icon "Sắp tới" hoặc gộp để còn 5 tab. Cho chạm một lần để đổi trạng thái ngủ, kèm thông báo xác nhận, và hiện giờ ngủ/dậy trong tab "Lịch".
