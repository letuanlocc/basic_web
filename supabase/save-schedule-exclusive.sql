-- Serialize seeker schedule saves by position/week and reserve each shift/day
-- for the first active employee who saves it.
-- Run in the Supabase SQL Editor as postgres before deploying the app changes.
begin;

create or replace function public.save_schedule_exclusive(
  p_employment_id uuid,
  p_week_start date,
  p_cells jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_position_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập để lưu lịch làm' using errcode = 'P0001';
  end if;

  select e.position_id
    into v_position_id
    from public.employments e
    where e.id = p_employment_id
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
    hashtextextended(v_position_id::text || ':' || p_week_start::text, 0)
  );

  if exists (
    select 1
      from jsonb_to_recordset(p_cells) as requested(shift_id uuid, weekday integer)
      join public.shift_assignments assigned
        on assigned.position_id = v_position_id
       and assigned.shift_id = requested.shift_id
       and assigned.week_start = p_week_start
       and assigned.weekday = requested.weekday
       and assigned.employment_id <> p_employment_id
  ) then
    raise exception 'Ca này vừa được người khác đăng ký. Hãy chọn ca khác.'
      using errcode = 'P0001';
  end if;

  return public.save_schedule(p_employment_id, p_week_start, p_cells);
end;
$$;

revoke all on function public.save_schedule_exclusive(uuid, date, jsonb) from public;
grant execute on function public.save_schedule_exclusive(uuid, date, jsonb) to authenticated;

commit;
