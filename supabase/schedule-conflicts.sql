-- Trùng giờ giữa các việc của cùng một nhân viên (khác vị trí/quán).
--   * Nhân viên tự đăng ký (save_schedule_exclusive): CHẶN CỨNG.
--   * Nhân viên thấy chi tiết việc đang bận (quán, việc, ca, giờ); chủ quán CHỈ biết "bận", không biết việc nào.
--   * Chủ quán chỉnh lịch (manage_schedule): CẢNH BÁO – lần đầu bị từ chối kèm danh sách ca trùng,
--     gửi lại với p_force = true thì được ghi đè.
-- Chạy trong Supabase SQL Editor (role postgres) SAU manage-schedule.sql và save-schedule-exclusive.sql,
-- TRƯỚC khi deploy code.
begin;

-- Giờ dạng số (8.5) → 08:30
create or replace function public.fmt_hour(h numeric)
returns text
language sql
immutable
as $$
  select lpad(floor(h)::int::text, 2, '0') || ':' || lpad(round((h - floor(h)) * 60)::int::text, 2, '0');
$$;

-- Các ca nhân viên đang giữ ở VIỆC KHÁC trong tuần (dùng để tô ô "Bận việc khác").
-- Gọi được bởi chính nhân viên đó hoặc chủ quán của vị trí đang xét.
create or replace function public.employment_busy(
  p_employment_id text,
  p_week_start date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_emp public.employments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập' using errcode = 'P0001';
  end if;

  select e.* into v_emp
    from public.employments e
    join public.positions pos on pos.id = e.position_id
    join public.shops s on s.id = pos.shop_id
   where e.id::text = p_employment_id
     and e.ended_at is null
     and (e.seeker_id = auth.uid() or s.owner_id = auth.uid());

  if not found then
    raise exception 'Không tìm thấy nhân viên' using errcode = 'P0001';
  end if;

  -- Chủ quán: chỉ trả các ô (ca của vị trí này, thứ) đang bận, không lộ việc/quán/giờ khác
  if v_emp.seeker_id <> auth.uid() then
    return coalesce((
      select jsonb_agg(jsonb_build_object('shift_id', sh_n.id, 'weekday', d.weekday) order by d.weekday, sh_n.start_hour)
        from public.shifts sh_n
        cross join generate_series(0, 6) as d(weekday)
       where sh_n.position_id = v_emp.position_id
         and sh_n.archived_at is null
         and exists (
           select 1
             from public.shift_assignments a
             join public.employments o on o.id = a.employment_id
             join public.shifts sh_o on sh_o.id = a.shift_id
            where o.seeker_id = v_emp.seeker_id
              and o.id <> v_emp.id
              and o.ended_at is null
              and a.week_start = p_week_start
              and a.weekday = d.weekday
              and sh_n.start_hour < sh_o.end_hour
              and sh_n.end_hour > sh_o.start_hour
         )
    ), '[]'::jsonb);
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'weekday', a.weekday,
             'start_hour', sh.start_hour,
             'end_hour', sh.end_hour,
             'shift_name', sh.name,
             'position_title', pos.title,
             'shop_name', s.name
           ) order by a.weekday, sh.start_hour)
      from public.shift_assignments a
      join public.employments o on o.id = a.employment_id
      join public.shifts sh on sh.id = a.shift_id
      join public.positions pos on pos.id = a.position_id
      join public.shops s on s.id = pos.shop_id
     where o.seeker_id = v_emp.seeker_id
       and o.id <> v_emp.id
       and o.ended_at is null
       and a.week_start = p_week_start
  ), '[]'::jsonb);
end;
$$;

drop function if exists public.employment_conflict_text(text, date, jsonb);

-- Nội bộ: mô tả các ca trong p_cells trùng giờ với việc khác của nhân viên; null nếu không trùng.
-- Chỉ xét từ hôm nay trở đi (ngày đã qua không đổi được).
create or replace function public.employment_conflict_text(
  p_employment_id text,
  p_week_start date,
  p_cells jsonb,
  p_detail boolean default true
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_days text[] := array['Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy','Chủ nhật'];
  v_text text;
begin
  select string_agg(
           case when p_detail
             then s.name || ' – ' || pos.title || ' (' || sh_o.name || ' ' || public.fmt_hour(sh_o.start_hour) || '–' ||
                  public.fmt_hour(sh_o.end_hour) || ', ' || v_days[c.weekday + 1] || ' ' || to_char(p_week_start + c.weekday, 'DD/MM') || ')'
             else sh_n.name || ' (' || v_days[c.weekday + 1] || ' ' || to_char(p_week_start + c.weekday, 'DD/MM') || ')'
           end,
           '; ' order by c.weekday, sh_n.start_hour)
    into v_text
    from (select distinct shift_id, weekday
            from jsonb_to_recordset(p_cells) as x(shift_id text, weekday integer)) c
    join public.shifts sh_n on sh_n.id::text = c.shift_id
    join public.employments me on me.id::text = p_employment_id
    join public.employments o on o.seeker_id = me.seeker_id and o.id <> me.id and o.ended_at is null
    join public.shift_assignments a on a.employment_id = o.id and a.week_start = p_week_start and a.weekday = c.weekday
    join public.shifts sh_o on sh_o.id = a.shift_id
    join public.positions pos on pos.id = a.position_id
    join public.shops s on s.id = pos.shop_id
   where c.weekday between 0 and 6
     and p_week_start + c.weekday >= v_today
     and sh_n.start_hour < sh_o.end_hour
     and sh_n.end_hour > sh_o.start_hour;
  return v_text;
end;
$$;

revoke all on function public.employment_busy(text, date) from public;
revoke all on function public.employment_conflict_text(text, date, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.employment_busy(text, date) to authenticated;

-- ---- Nhân viên tự lưu: chặn cứng nếu trùng giờ việc khác ----
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
  v_conflict text;
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

  -- Khóa theo nhân viên để hai việc khác nhau không cùng lúc tạo ca trùng giờ
  perform pg_advisory_xact_lock(hashtextextended('seeker:' || auth.uid()::text, 0));
  perform pg_advisory_xact_lock(
    hashtextextended(v_position_id || ':' || p_week_start::text, 0)
  );

  select pos.max_per_shift into v_max_per_shift
    from public.positions pos
   where pos.id::text = v_position_id;

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

  v_conflict := public.employment_conflict_text(p_employment_id, p_week_start, p_cells, true);
  if v_conflict is not null then
    raise exception 'Bạn đã có ca trùng giờ ở việc khác: %. Hãy bỏ chọn ca này rồi lưu lại.', v_conflict
      using errcode = 'P0001';
  end if;

  execute format('select public.save_schedule(%L, %L, %L)', p_employment_id, p_week_start, p_cells)
    into v_result;
  return v_result;
end;
$$;

revoke all on function public.save_schedule_exclusive(text, date, jsonb) from public;
grant execute on function public.save_schedule_exclusive(text, date, jsonb) to authenticated;

-- ---- Chủ quán chỉnh lịch: cảnh báo trùng giờ, p_force = true để ghi đè ----
drop function if exists public.manage_schedule(text, date, jsonb);

create or replace function public.manage_schedule(
  p_employment_id text,
  p_week_start date,
  p_cells jsonb,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_emp public.employments%rowtype;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_total integer;
  v_conflict text;
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập' using errcode = 'P0001';
  end if;

  if p_cells is null or jsonb_typeof(p_cells) <> 'array' then
    raise exception 'Danh sách ca làm không hợp lệ' using errcode = 'P0001';
  end if;

  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start phải là thứ Hai' using errcode = 'P0001';
  end if;

  select e.* into v_emp
    from public.employments e
    join public.positions pos on pos.id = e.position_id
    join public.shops s on s.id = pos.shop_id
   where e.id::text = p_employment_id
     and e.ended_at is null
     and s.owner_id = auth.uid()
   for update of e;

  if not found then
    raise exception 'Không tìm thấy nhân viên trong quán của bạn' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('seeker:' || v_emp.seeker_id::text, 0));
  perform pg_advisory_xact_lock(
    hashtextextended(v_emp.position_id::text || ':' || p_week_start::text, 0)
  );

  if exists (
    select 1
      from (select distinct shift_id, weekday
              from jsonb_to_recordset(p_cells) as x(shift_id text, weekday integer)) c
     where c.weekday is null or c.weekday not between 0 and 6
        or not exists (
          select 1 from public.shifts sh
           where sh.id::text = c.shift_id
             and sh.position_id = v_emp.position_id
             and sh.archived_at is null
        )
  ) then
    raise exception 'Có ca không hợp lệ hoặc không thuộc vị trí này' using errcode = 'P0001';
  end if;

  if not coalesce(p_force, false) then
    v_conflict := public.employment_conflict_text(p_employment_id, p_week_start, p_cells, false);
    if v_conflict is not null then
      raise exception 'Trùng lịch việc khác: %', v_conflict using errcode = 'P0001';
    end if;
  end if;

  delete from public.shift_assignments a
   where a.employment_id = v_emp.id
     and a.week_start = p_week_start
     and p_week_start + a.weekday >= v_today;

  insert into public.shift_assignments (employment_id, shift_id, position_id, week_start, weekday)
  select v_emp.id, sh.id, v_emp.position_id, p_week_start, c.weekday
    from (select distinct shift_id, weekday
            from jsonb_to_recordset(p_cells) as x(shift_id text, weekday integer)) c
    join public.shifts sh on sh.id::text = c.shift_id
   where p_week_start + c.weekday >= v_today;

  select coalesce(sum(sh.end_hour - sh.start_hour), 0) into v_total
    from public.shift_assignments a
    join public.shifts sh on sh.id = a.shift_id
   where a.employment_id = v_emp.id
     and a.week_start = p_week_start;

  return jsonb_build_object('total_hours', v_total);
end;
$$;

revoke all on function public.manage_schedule(text, date, jsonb, boolean) from public;
grant execute on function public.manage_schedule(text, date, jsonb, boolean) to authenticated;

commit;

notify pgrst, 'reload schema';
