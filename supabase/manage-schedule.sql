-- HR (chủ quán) xem và chỉnh lịch ca của nhân viên trong quán của mình.
-- Chạy trong Supabase SQL Editor (role postgres) TRƯỚC khi deploy code.
-- Khác với save_schedule_exclusive (nhân viên tự lưu): HR được vượt max_per_shift và giới hạn giờ,
-- nhưng không đụng vào các ngày đã qua.
begin;

-- Các ô (ca, thứ) nhân viên đang giữ trong một tuần. Chỉ chủ quán của vị trí gọi được.
create or replace function public.get_employment_cells(
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
     and s.owner_id = auth.uid();

  if not found then
    raise exception 'Không tìm thấy nhân viên trong quán của bạn' using errcode = 'P0001';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('shift_id', a.shift_id, 'weekday', a.weekday) order by a.weekday, a.shift_id)
      from public.shift_assignments a
     where a.employment_id = v_emp.id
       and a.week_start = p_week_start
  ), '[]'::jsonb);
end;
$$;

-- Thay toàn bộ ca của nhân viên trong MỘT tuần. p_cells = [{ shift_id, weekday }], weekday 0 = thứ Hai.
create or replace function public.manage_schedule(
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
  v_emp public.employments%rowtype;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_total integer;
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

  -- Cùng khóa với save_schedule_exclusive để không đè nhau khi nhân viên đang tự lưu
  perform pg_advisory_xact_lock(
    hashtextextended(v_emp.position_id::text || ':' || p_week_start::text, 0)
  );

  -- Mọi ô gửi lên phải thuộc ca còn dùng của đúng vị trí này
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

  -- Chỉ đổi các ngày từ hôm nay trở đi; lịch sử các ngày đã qua giữ nguyên
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

revoke all on function public.get_employment_cells(text, date) from public;
revoke all on function public.manage_schedule(text, date, jsonb) from public;
grant execute on function public.get_employment_cells(text, date) to authenticated;
grant execute on function public.manage_schedule(text, date, jsonb) to authenticated;

commit;
