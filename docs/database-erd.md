# Sơ đồ cơ sở dữ liệu (ERD)

CSDL: **PostgreSQL** do Supabase quản lý. Sơ đồ dưới đây lập từ schema thật của project (cột, kiểu dữ liệu, khóa ngoại), không phải vẽ tay.
Mermaid hiển thị trực tiếp trên GitHub.

```mermaid
erDiagram
    users ||--o| seeker_profiles : "hồ sơ người tìm việc"
    users ||--o{ shops : "chủ quán sở hữu"
    users ||--o| google_connections : "kết nối Google"
    shops ||--o{ positions : "đăng tin tuyển"
    shops ||--o{ shop_photos : "ảnh quán"
    positions ||--o{ shifts : "ca làm"
    positions ||--o{ position_items : "mô tả, yêu cầu, quyền lợi"
    positions ||--o{ applications : "nhận hồ sơ"
    positions ||--o{ invitations : "gửi lời mời"
    positions ||--o{ saved_jobs : "được lưu"
    positions ||--o{ employments : "nhân viên đang làm"
    seeker_profiles ||--o{ applications : "ứng tuyển"
    seeker_profiles ||--o{ invitations : "nhận lời mời"
    seeker_profiles ||--o{ saved_jobs : "lưu tin"
    seeker_profiles ||--o{ seeker_availability : "khung giờ rảnh"
    seeker_profiles ||--o{ employments : "làm việc"
    seeker_profiles ||--o{ seeker_busy_slots : "báo bận"
    applications ||--o| employments : "được nhận thành"
    employments ||--o{ shift_assignments : "ca đã đăng ký"
    shifts ||--o{ shift_assignments : "được xếp"
    shifts ||--o{ seeker_busy_slots : "ca bận"
    employments ||--o{ calendar_events : "đồng bộ lịch"

    users {
        uuid id PK
        varchar full_name
        varchar email
        varchar phone
        user_role role "seeker | employer"
        timestamptz created_at
        timestamptz updated_at
    }
    seeker_profiles {
        uuid user_id PK, FK
        text avatar_url
        int birth_year
        gender_t gender
        varchar area
        seeker_work_mode work_mode
        varchar availability_note
        boolean has_experience
        text experience
        int language_level
        text strengths
        text improvements
        timestamptz updated_at
    }
    seeker_availability {
        uuid seeker_id PK, FK
        free_slot slot PK
    }
    shops {
        bigint id PK
        uuid owner_id FK
        varchar name
        work_mode mode
        varchar industry
        varchar address
        varchar ward
        varchar city
        varchar phone
        text fanpage_url
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    shop_photos {
        bigint id PK
        bigint shop_id FK
        text url
        varchar caption
        int sort_order
        timestamptz created_at
    }
    positions {
        bigint id PK
        bigint shop_id FK
        varchar title
        work_mode mode
        int salary_amount
        salary_unit salary_unit
        varchar summary
        varchar address
        varchar work_form
        boolean no_experience
        boolean accepts_intern
        int headcount
        int pending_limit
        smallint_array work_days
        numeric open_hour
        numeric close_hour
        int min_week_hours
        int max_week_hours
        int max_day_hours
        numeric max_shift_hours
        int max_per_shift
        int min_per_shift
        date deadline
        date start_date
        varchar contact_name
        varchar contact_phone
        text schedule_note
        boolean is_open
        timestamptz created_at
        timestamptz updated_at
    }
    position_items {
        bigint id PK
        bigint position_id FK
        item_kind kind
        varchar content
        int sort_order
    }
    shifts {
        bigint id PK
        bigint position_id FK
        varchar name
        numeric start_hour
        numeric end_hour
        int sort_order
        timestamptz archived_at
    }
    applications {
        bigint id PK
        bigint position_id FK
        uuid seeker_id FK
        application_status status
        application_source source
        reject_reason reject_reason
        timestamptz decided_at
        timestamptz created_at
    }
    invitations {
        bigint id PK
        bigint position_id FK
        uuid seeker_id FK
        varchar message
        invitation_status status
        timestamptz responded_at
        timestamptz created_at
    }
    saved_jobs {
        uuid seeker_id PK, FK
        bigint position_id PK, FK
        timestamptz created_at
    }
    employments {
        bigint id PK
        bigint position_id FK
        uuid seeker_id FK
        bigint application_id FK
        timestamptz started_at
        timestamptz ended_at
    }
    shift_assignments {
        bigint id PK
        bigint employment_id FK
        bigint shift_id FK
        bigint position_id FK
        date week_start
        int weekday "0 = Thứ hai"
        timestamptz created_at
    }
    seeker_busy_slots {
        uuid seeker_id PK, FK
        bigint shift_id PK, FK
        date busy_date PK
        timestamptz created_at
    }
    google_connections {
        uuid user_id PK, FK
        text refresh_token "chỉ server đọc được"
        text google_email
        text status "active | revoked"
        boolean auto_sync_manager_changes
        text last_error
        timestamptz connected_at
        timestamptz updated_at
    }
    calendar_events {
        bigint id PK
        bigint employment_id FK
        bigint shift_id
        date week_start
        int weekday
        text google_event_id
        text payload_hash
        text sync_status "synced | pending | error | deleted"
        text last_error
        timestamptz updated_at
    }
```

## Giải thích nhóm bảng
| Nhóm | Bảng | Vai trò |
|---|---|---|
| Tài khoản | `users`, `seeker_profiles`, `seeker_availability` | Tài khoản dùng chung (liên kết Supabase Auth), hồ sơ và giờ rảnh của người tìm việc |
| Quán và tin tuyển | `shops`, `shop_photos`, `positions`, `position_items`, `shifts` | Chủ quán tạo quán, đăng vị trí tuyển, mỗi vị trí có nhiều ca |
| Tuyển dụng | `applications`, `invitations`, `saved_jobs` | Ứng tuyển, lời mời, lưu tin |
| Làm việc và lịch | `employments`, `shift_assignments`, `seeker_busy_slots` | Nhân viên chính thức, ca đã đăng ký theo tuần, ca báo bận |
| Google Calendar | `google_connections`, `calendar_events` | Token kết nối và ánh xạ ô lịch sang event Google |

## Ghi chú
- **View `position_overview`:** gộp `positions` với thông tin quán, số người đã nhận (`filled`), đang chờ (`pending`) và cờ `accepting`. Dùng cho trang danh sách việc.
- **Bảng bảo mật cao:** `google_connections` và `calendar_events` bật RLS, thu hồi quyền `anon`/`authenticated`, chỉ server (secret key) truy cập được.
- **Quan hệ `shift_assignments`, `seeker_busy_slots`, `calendar_events.shift_id`:** vẽ theo quan hệ logic; schema chưa khai báo khóa ngoại cho các cột này ở tầng dữ liệu.
- **Kiểu enum** (`user_role`, `work_mode`, `salary_unit`, `application_status`…) được định nghĩa trong Postgres. Giá trị cụ thể xem trong Supabase → Database → Enumerated Types.
- Script tạo và thay đổi schema: thư mục [supabase/](../supabase/) (migration theo ngày và các hàm RPC).
