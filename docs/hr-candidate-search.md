# HR tìm ứng viên

Nhánh: `feature/hr-candidate-search`, từ develop `97bb69d1e4be556d3f60a4a91f61239700b9d2c0`.

## Hành vi

- Thanh đầu trang HR tìm người, gồm tên, khu vực, kinh nghiệm, điểm mạnh/kỹ năng, ghi chú và khung giờ rảnh.
- Từ khóa không phân biệt hoa/thường hoặc dấu tiếng Việt; các từ phải cùng xuất hiện trong thông tin hồ sơ. Đây là tìm từ khóa, không phân tích ý định bằng AI.
- Gõ để tìm sau 250ms; Enter hoặc nút Tìm chạy ngay. Xóa từ khóa trả lại danh sách theo bộ lọc; Xóa bộ lọc xóa cả từ khóa.
- Dùng cùng hình thức, giờ rảnh, kinh nghiệm, khu vực, ngoại ngữ và sắp xếp hiện có.
- Tìm từ các trang HR khác chuyển đến Ứng viên với từ khóa tương ứng.
- Phản hồi cũ không ghi đè kết quả mới. Có trạng thái đang tìm, không có kết quả và lỗi tải.

## API và giới hạn

`GET /api/seekers?q=...` tiếp tục yêu cầu vai employer và dùng client Supabase theo token người dùng/RLS.

Từ khóa tối đa 200 ký tự; giá trị không phải chuỗi bị từ chối với HTTP 400. Từ khóa được so khớp như văn bản, không nội suy vào cú pháp truy vấn SQL/PostgREST.

Lọc từ khóa và khung giờ trước khi giới hạn kết quả (mặc định 50, tối đa 100 khi gọi API). Backend đọc từng lô 200 hồ sơ đã lọc dưới quyền người dùng, giữ sắp xếp và thứ tự phụ ổn định theo user_id. Vì vậy không bỏ sót người nằm ngoài 50 hồ sơ đầu.

Đây là cách tìm trên phía server phù hợp quy mô prototype; tìm từ khóa có thể đọc nhiều lô khi số hồ sơ lớn. Khi dữ liệu tăng đáng kể, nên chuyển phần so khớp vào truy vấn database có chỉ mục. Không thêm schema/RPC, dependency hoặc đổi RLS trong thay đổi này.

## Kiểm chứng ngày 13/11/2026

- Node tests: tìm tiếng Việt, từ khóa đa trường, kết hợp bộ lọc, người ngoài lô đầu, lọc trước giới hạn, đầu vào lỗi, debounce, phản hồi đảo thứ tự, Enter/reset và xử lý lỗi.
- Chạy cùng kiểm tra lương hiện có để kiểm tra hồi quy.
- Playwright CLI trên app chạy cục bộ, đọc Supabase thật bằng phiên employer demo: tìm hai tên demo có/không dấu, Enter, nút Tìm, không có kết quả, reset, bộ lọc kết hợp, xóa từ khóa và tìm từ trang HR khác đạt.
- Desktop và viewport 390×844: quan sát chữ tiếng Việt, ô tìm kiếm/nút Tìm và kết quả; không tràn ngang.
- API thực tế: khách HTTP 401, q dài quá mức HTTP 400, ký tự đặc biệt được xử lý như văn bản. Bộ lọc kinh nghiệm khớp/không khớp trả đúng người/không có kết quả.
- Các lượt thử dùng đăng nhập API thật để nạp phiên vào browser riêng. Không kiểm thử lại giao diện đăng nhập trong thay đổi này.
- Máy chủ thử chặn ghi dữ liệu ứng dụng; không tạo/xóa/sửa hồ sơ hoặc gửi lời mời.
- Công cụ Browser không kết nối được; kiểm tra giao diện thực hiện qua Playwright CLI riêng.
- Chưa xác nhận bản Vercel; cần nhóm trưởng duyệt và cập nhật deployment sau PR.

Ảnh bằng chứng thử nghiệm lưu cục bộ trong `output/playwright/`, không đưa artifact hoặc thông tin phiên đăng nhập lên Git.

## Bổ sung: ngoại ngữ “Chưa có”

Hồ sơ người tìm việc có 4 mức 0–3. HR có 5 lựa chọn vì “Không yêu cầu” là không lọc, tách riêng với “Chưa có” (mức 0):
- Không yêu cầu: lấy mọi mức.
- Chưa có: chỉ `language_level=0`.
- Từ giao tiếp cơ bản: `min_lang=1`.
- Từ khá: `min_lang=2`.
- Tốt: `min_lang=3`.

API bổ sung `language_level` chính xác 0–3, không đổi nghĩa `min_lang=0` của client cũ. Giá trị không hợp lệ bị từ chối với HTTP 400. Trường null/thiếu không bị coi là mức 0.

Tìm từ khóa cũng xét các nhãn ngoại ngữ có/không dấu. Đây vẫn là tìm văn bản đa trường; dùng bộ lọc để chọn chính xác mức 0.

Kiểm chứng bổ sung: tổng 22/22 bài kiểm tra đạt. App cục bộ đọc Supabase thật trả 8 hồ sơ khi không yêu cầu, 5 hồ sơ mức 0, lần lượt 3/1/1 hồ sơ cho ngưỡng 1/2/3 tại thời điểm kiểm tra. Giao diện khớp API; tìm tên demo kèm mức 0, reset về tất cả và viewport 390px đạt. Không sửa dữ liệu hồ sơ.
