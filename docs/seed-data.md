# Thêm dữ liệu mẫu CaRảnh

Gói này bám theo `caranh_supabase.sql` **bản 2, ngày 09/11/2026** bạn cung cấp.
SHA-256 của SQL nguồn: `50500689c7cca1040cd11290074f5f658487059c070dea6622e22c89f62cd014`.

Project đích: `basic_web` (`uhaakvedcnodndhpvurt`). Script kiểm tra đúng project trước khi kết nối.
Đây là script bổ sung dữ liệu, **không phải file tạo lại schema**. Các bảng, trigger và RPC của SQL v2 phải có sẵn.

## 1. Chuẩn bị nhánh Git

Mở terminal tại thư mục repo `basic_web`. Chạy `git status` và giữ lại mọi thay đổi đang làm trước khi chuyển nhánh.

```powershell
git switch develop
git pull --ff-only origin develop
git switch -c feature/seed-data
```

Nếu chưa có repo trên máy:

```powershell
git clone https://github.com/letuanlocc/basic_web.git
cd basic_web
```

Sau đó mới thực hiện các lệnh tạo nhánh ở trên. Nếu đã tạo `feature/seed-data`, chỉ chuyển về nhánh đó, không tạo lại.

Giải nén gói ZIP, chép **4 thư mục** `scripts`, `docs`, `public`, `supabase` vào thư mục gốc repo.
Gộp với thư mục `public` sẵn có, không thay cả thư mục giao diện. Chỉ có các file mới trong `public/demo/shops`.
Không cần sửa `package.json`.

## 2. Cấu hình trên máy

```powershell
npm install
```

Repo đã khai báo `dotenv` và `@supabase/supabase-js`; script dùng các thư viện này.
Trong `.env` của repo, cần ba biến kết nối hiện có và thêm một mật khẩu do bạn tự chọn:

```dotenv
SUPABASE_URL=https://uhaakvedcnodndhpvurt.supabase.co
SUPABASE_PUBLISHABLE_KEY=DIEN_PUBLISHABLE_KEY_CUA_PROJECT
SUPABASE_SECRET_KEY=DIEN_SECRET_KEY_CUA_PROJECT
DEMO_SEED_PASSWORD=TU_DAT_MAT_KHAU_RIENG_IT_NHAT_12_KY_TU
```

Các giá trị viết hoa ở trên là chỗ điền, không phải khóa/mật khẩu dùng thật.
Giữ nguyên các biến `.env` khác của nhóm. Nếu chưa có khóa cần thiết, nhờ Lộc cấu hình trực tiếp trên máy bạn.
Không gửi khóa hay mật khẩu qua chat, không đưa `.env` lên Git và không đặt secret key vào mã frontend.
Sáu tài khoản demo dùng cùng `DEMO_SEED_PASSWORD`. Khi chạy lại, dùng đúng mật khẩu lần đầu;
script không đổi mật khẩu tài khoản đã tồn tại.

Việc được mời vào Dashboard không tự tạo `.env` hoặc cung cấp secret key cho script trên máy.

## 3. Xem trước, chạy và kiểm tra

Xem danh sách mẫu, không kết nối database:

```powershell
node scripts/seed-demo.js
```

Khi đã kiểm tra đúng nhánh và project, thêm dữ liệu:

```powershell
node scripts/seed-demo.js --apply
```

Lệnh này **ghi trực tiếp vào database chung của nhóm**. Nhánh Git không tạo ra database riêng.
Admin client chỉ dùng để tạo tài khoản Auth và đọc kiểm tra; ghi dữ liệu ứng dụng đi qua phiên đăng nhập của người dùng và các RPC hiện có.
Các tài khoản demo được xác nhận email lúc tạo bằng Auth Admin API, không cần gửi thư ra ngoài hay tắt xác nhận email của project.

Kiểm tra dữ liệu sau khi tạo (chỉ đọc dữ liệu ứng dụng, không tạo tài khoản/đăng nhập demo):

```powershell
node scripts/seed-demo.js --check
```

Nếu có lỗi, dừng ở lỗi đầu tiên và giữ lại phần đã thành công. Sau khi xử lý nguyên nhân,
chạy lại `--apply`; script đọc bản ghi hiện có trước khi tạo thêm. Mỗi API/RPC có transaction riêng,
**toàn bộ lần seed không nằm trong một transaction duy nhất**.

Không chạy `caranh_reset.sql`, không xóa bảng và không tắt RLS để sửa lỗi seed.

## 4. Bộ mẫu

Tất cả tên bắt đầu bằng `[DEMO]`. Các tên, email, số điện thoại, địa chỉ và cửa hàng là dữ liệu minh họa.
Số điện thoại chỉ cần khớp CHECK của schema, không dùng để gọi/SMS. Email `.test` không dùng nhận thư.

| Mã | Email đăng nhập | Vai |
|---|---|---|
| s1 | seeker1@caranh-demo.test | seeker |
| s2 | seeker2@caranh-demo.test | seeker |
| e1 | employer1@caranh-demo.test | employer |
| e2 | employer2@caranh-demo.test | employer |
| e3 | employer3@caranh-demo.test | employer |
| e4 | employer4@caranh-demo.test | employer |

| Mã | Cửa hàng | Vị trí | Hình thức | Lương minh họa |
|---|---|---|---|---|
| p1 | Cà phê Mộc / e1 | Nhân viên phục vụ | Part-time, offline | 25.000đ/giờ |
| p2 | Cà phê Mộc / e1 | Nhân viên thu ngân | Full-time, offline | 7.500.000đ/tháng |
| p3 | Bếp An / e2 | Nhân viên phụ bếp | Part-time, offline | 28.000đ/giờ |
| p4 | Tiệm Lá / e3 | Nhân viên bán hàng | Full-time, offline | 7.200.000đ/tháng |
| p5 | Studio Mây / e4 | Cộng tác viên nội dung | Part-time, online | 35.000đ/giờ |

`work_form` chứa Full-time/Part-time. `mode` chứa online/offline; đây là hai khái niệm khác nhau.
Mỗi vị trí có 3 nội dung: công việc, yêu cầu, quyền lợi; và 2 ca:

| Hình thức | Ca sáng | Ca tối |
|---|---|---|
| Part-time | 08:00–12:00 | 18:00–22:00 |
| Full-time | 06:00–14:00 | 14:00–22:00 |

| Người tìm việc | Vị trí | Trạng thái đơn | Nguồn |
|---|---|---|---|
| s1 | p1 | accepted | direct |
| s1 | p2 | rejected, lý do employer | direct |
| s2 | p3 | withdrawn | direct |
| s2 | p4 | pending | invite |

| Nhà tuyển dụng | Người nhận | Vị trí | Trạng thái lời mời |
|---|---|---|---|
| e3 | s2 | p4 | accepted |
| e4 | s1 | p5 | pending |
| e2 | s1 | p3 | declined |

Lời mời p4 được nhận qua `respond_invitation` nên tự sinh đơn pending nguồn invite, không thêm một đơn rời nữa.
Đơn accepted p1 được duyệt bằng `decide_application` nên tự tạo đúng 1 nhân viên s1 đang làm (`ended_at IS NULL`).
Hai tài khoản seeker có đủ trường bắt buộc, mỗi người có 3 khung giờ rảnh.

Tin đã lưu: s1 lưu p3/p5, s2 lưu p1/p5 (4 bản ghi).
Nhân viên s1 có 3 ô lịch tuần sau (sáng thứ Hai, tối thứ Tư, sáng thứ Sáu = 12 giờ).
Tuần này tạo thêm tối đa 3 ô ở các ngày sau hôm chạy; không thêm ca vào ngày đã qua hoặc hôm nay.
Nếu đang là Chủ nhật, chỉ có lịch tuần sau. Dưới giờ tối thiểu tuần này là cảnh báo hợp lệ theo SQL v2.
Script giữ nguyên lịch đã có của từng tuần, không thay lựa chọn người dùng đã sửa.

### Ngày tuyển và ngày bắt đầu

SQL v2 yêu cầu `start_date >= deadline`. Để p1 có nhân viên đang làm ngay mà vẫn đúng điều kiện này,
cả hạn tuyển lẫn ngày bắt đầu của p1 đều là ngày chạy seed theo giờ Việt Nam.
Bốn tin còn lại có hạn tuyển sau 30 ngày, ngày bắt đầu sau hạn 1 ngày.
Sau hôm seed, p1 có thể không còn trong kết quả tìm kiếm tin đang tuyển; bản ghi, nhân viên và lịch vẫn tồn tại.
Script không tự dời hạn của tin đã có khi chạy lại. `--check` đọc đủ 5 tin trong database, không yêu cầu cả 5 luôn hiện trên trang tìm kiếm.

## 5. Khi chạy lại

- Dùng cùng email demo và marker `app_metadata.caranh_seed = caranh-demo-v1` để nhận diện tài khoản.
- Nếu email hoặc số điện thoại trùng với tài khoản ngoài bộ seed, script dừng và không ghi đè tài khoản đó.
- Chỉ điền các trường hồ sơ/cửa hàng đang trống; không xóa ảnh, lịch hay dữ liệu thật của nhóm.
- Tin, nội dung, ca, tin đã lưu được đọc trước khi thêm. Không sửa hạn tuyển của tin đã tồn tại.
- Đơn/lời mời pending có thể được chuyển tiếp tới trạng thái mục tiêu khi khôi phục lần chạy bị ngắt.
- Nếu bạn đã dùng demo để đổi trạng thái sang một trạng thái kết thúc khác, script dừng thay vì đảo ngược lịch sử.
- Chạy một tiến trình seed mỗi lần; script không khóa toàn bộ các lần chạy đồng thời.

## 6. Kiểm tra và bàn giao

Chạy kiểm tra offline (không cần `.env`, không gọi Supabase):

```powershell
node --check scripts/seed-demo.js
node --test scripts/seed-demo.test.js
```

Các bài kiểm tra offline gồm dữ liệu/ràng buộc, ngày biên, vai thực hiện RPC, khôi phục lần chạy dở,
chạy lặp không tạo trùng, dừng khi trạng thái đã thay đổi và xem trước không kết nối.
Fixture giả lập RPC trong test **không thay thế kiểm thử PostgreSQL/Supabase thật**.
Đã chạy thành công trên project `basic_web` (`uhaakvedcnodndhpvurt`) ngày **10/11/2026**:

- Kiểm tra cú pháp và 14/14 bài kiểm tra offline đạt.
- `--apply` hoàn tất, kiểm tra dữ liệu tích hợp cuối script đạt.
- Truy vấn chỉ đọc độc lập xác nhận: 6 tài khoản (2 seeker, 4 employer), 4 cửa hàng, 5 vị trí, 10 ca, 4 đơn đủ trạng thái, 3 lời mời đủ trạng thái, 1 nhân viên đang làm và 4 tin đã lưu.
- Có 6 ô lịch, chia đều cho tuần bắt đầu 09/11/2026 và 16/11/2026; mỗi tuần 12 giờ.
- Tìm kiếm công khai trả về 5 tin mẫu tại thời điểm kiểm tra. Tin p1 có thể hết hạn sau ngày seed như giải thích ở trên.
- Chưa kiểm chứng giao diện hiển thị dữ liệu bằng trình duyệt trong lần thực hiện này.

Sau `--apply`, chạy `--check`, rồi mở Table Editor để xem dữ liệu.
File `supabase/check-demo.sql` gồm các truy vấn SELECT để kiểm tra độc lập trong SQL Editor (vai postgres).
Ảnh cửa hàng trỏ tới `/demo/shops/*.svg`; cần chép các file vào repo và phục vụ thư mục `public` như app hiện tại.
Chỉ xem `shop_photos` trên Dashboard không có nghĩa là Dashboard sẽ hiển thị được đường dẫn ảnh tương đối này.

Phần giao diện trên `develop` được kiểm tra trước đó còn chưa gọi API; seed thành công không tự nối API vào HTML.
Khi frontend đã nối API, kiểm tra `/api/positions` và `/api/positions/<id>` qua server đang chạy.

Kiểm tra các file sắp commit và thêm đúng file mới:

```powershell
git status
git add scripts/seed-demo.js scripts/seed-demo.test.js docs/seed-data.md public/demo/shops supabase/check-demo.sql
git diff --cached --stat
git commit -m "feat: add CaRanh demo seed data"
git push -u origin feature/seed-data
```

Tạo Pull Request: **base `develop`**, compare `feature/seed-data`. Không push/merge trực tiếp vào main.
PR mô tả bộ mẫu và ghi đúng kiểm tra đã chạy; chỉ ghi đã seed/kiểm tra Supabase nếu chính bạn đã thực hiện thành công.
Nếu `git status` có file `.env` sắp được commit, bỏ riêng file đó khỏi staging trước khi commit.

## Nguồn đối chiếu API

- SQL v2 do bạn cung cấp và models trên nhánh `develop` của `letuanlocc/basic_web`.
- [Supabase Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
- [Supabase Auth Admin listUsers](https://supabase.com/docs/reference/javascript/auth-admin-listusers).

Auth Admin API chỉ chạy ở Node trên máy/server, không đưa secret key vào trình duyệt.
