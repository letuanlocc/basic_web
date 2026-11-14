-- Serialize seeker schedule saves by position/week and reserve shifts by max_per_shift
-- for the first employees who save them.
-- Run in the Supabase SQL Editor as postgres before deploying the app changes.
-- Id của vị trí/ca/nhân viên là số (không phải uuid), nên các tham số id nhận dạng text và
-- so sánh qua ::text; save_schedule được gọi bằng literal không gắn kiểu để Postgres tự khớp chữ ký.
begin;

-- Bản cũ khai báo id kiểu uuid (sai), xóa để không bị trùng chữ ký
drop function if exists public.save_schedule_exclusive(uuid, date, jsonb);

create or replace function public.save_schedule_exclusive(
  p_employment_id text,
  p_week_start date,
  p_cells jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_position_id text;
  v_max_per_shift integer;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập để lưu lịch làm' using errcode = 'P0001';
  end if;

  select e.position_id::text
    into v_position_id
    from public.employments e
    where e.id::text = p_employment_id
      and e.seeker_id = auth.uid()
      and e.ended_at is null
    for update;

  if not found then
    raise exception 'Không tìm thấy vị trí đang làm của bạn' using errcode = 'P0001';
  end if;

  if p_cells is null or jsonb_typeof(p_cells) <> 'array' then
    raise exception 'Danh sách ca làm không hợp lệ' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_position_id || ':' || p_week_start::text, 0)
  );

  select pos.max_per_shift into v_max_per_shift
    from public.positions pos
   where pos.id::text = v_position_id;

  -- Ca đầy = số người khác đã giữ ca đó >= max_per_shift do chủ quán đặt (null = không giới hạn)
  if v_max_per_shift is not null and exists (
    select 1
      from jsonb_to_recordset(p_cells) as requested(shift_id text, weekday integer)
     where (
       select count(*)
         from public.shift_assignments assigned
        where assigned.position_id::text = v_position_id
          and assigned.shift_id::text = requested.shift_id
          and assigned.week_start = p_week_start
          and assigned.weekday = requested.weekday
          and assigned.employment_id::text <> p_employment_id
     ) >= v_max_per_shift
  ) then
    raise exception 'Ca này đã đủ người. Hãy chọn ca khác.'
      using errcode = 'P0001';
  end if;

  execute format('select public.save_schedule(%L, %L, %L)', p_employment_id, p_week_start, p_cells)
    into v_result;
  return v_result;
end;
$$;

revoke all on function public.save_schedule_exclusive(text, date, jsonb) from public;
grant execute on function public.save_schedule_exclusive(text, date, jsonb) to authenticated;

commit;

notify pgrst, 'reload schema';
