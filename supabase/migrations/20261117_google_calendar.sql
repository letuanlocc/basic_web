-- Tích hợp Google Calendar (một chiều: CaRảnh -> Google).
-- Chạy trong Supabase SQL Editor (role postgres) trước khi triển khai code backend.
-- Id của employments/shifts là số (bigint), user là uuid (auth.users).
-- Hai bảng này chỉ server (client "admin", secret key) được đọc/ghi: bật RLS, không tạo policy,
-- thu hồi quyền của anon/authenticated -> refresh_token không bao giờ lọt ra trình duyệt.
begin;

-- 1) Kết nối tài khoản Google của từng người dùng
create table if not exists public.google_connections (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  refresh_token  text not null,
  google_email   text,
  -- active: dùng được | revoked: token hỏng/bị thu hồi, cần kết nối lại
  status         text not null default 'active' check (status in ('active', 'revoked')),
  -- nhân viên bật: khi chủ quán chỉnh lịch thì vẫn tự cập nhật lên Google của họ
  auto_sync_manager_changes boolean not null default true,
  last_error     text,
  connected_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 2) Ánh xạ ô lịch -> event Google (để cập nhật/xoá thay vì tạo trùng)
create table if not exists public.calendar_events (
  id              bigint generated always as identity primary key,
  employment_id   bigint not null references public.employments(id) on delete cascade,
  shift_id        bigint not null,
  week_start      date   not null,
  weekday         smallint not null check (weekday between 0 and 6),
  google_event_id text,
  -- hash giờ/tiêu đề đã đẩy lên, để biết khi nào cần cập nhật
  payload_hash    text,
  -- synced | pending | error | deleted
  sync_status     text not null default 'pending' check (sync_status in ('synced', 'pending', 'error', 'deleted')),
  last_error      text,
  updated_at      timestamptz not null default now(),
  unique (employment_id, shift_id, week_start, weekday)
);

create index if not exists calendar_events_employment_idx on public.calendar_events (employment_id, week_start);

-- 3) Khóa quyền: chỉ service role
alter table public.google_connections enable row level security;
alter table public.calendar_events    enable row level security;
revoke all on public.google_connections from public, anon, authenticated;
revoke all on public.calendar_events    from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';
