-- CaRảnh · 2026-11-13 · Giờ có phút
-- Giờ mở/đóng cửa và giờ ca lưu dạng số thập phân theo bước 15 phút (8.5 = 08:30, 12.75 = 12:45).
--
-- Chạy trong Supabase → SQL Editor → New query → dán cả file → Run.
-- Cả file là một transaction: lỗi ở bất kỳ bước nào thì DB giữ nguyên như cũ.
--
-- Quy tắc sửa tin ở DB đã có sẵn, file này KHÔNG đổi:
--   positions_validate: số người cần >= số nhân viên, không bỏ ngày đã có người đăng ký, ca phải hợp quy định mới
--   shifts_validate:    không đổi giờ / bỏ ca đã có người đăng ký tuần này hoặc tuần sau

begin;

do $$
declare
  v_views   record;
  v_saved   jsonb := '[]'::jsonb;  -- view phụ thuộc positions/shifts
  v_funcs   jsonb := '[]'::jsonb;  -- hàm trả về kiểu của các view đó (vd: search_positions → position_overview)
  v_sched   text;                  -- định nghĩa get_position_schedule
  v_sched_acl aclitem[];
  x jsonb;
  a record;
begin
  -- 1) Lưu lại view (định nghĩa, security_invoker…, quyền GRANT)
  for v_views in
    select c.oid, n.nspname, c.relname, c.reltype, pg_get_viewdef(c.oid) as def, c.reloptions, c.relacl
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'v' and c.oid in (
      select distinct r.ev_class from pg_depend d join pg_rewrite r on r.oid = d.objid
      where d.refobjid in ('public.positions'::regclass, 'public.shifts'::regclass)
        and r.ev_class not in ('public.positions'::regclass, 'public.shifts'::regclass))
  loop
    v_saved := v_saved || jsonb_build_object('schema', v_views.nspname, 'name', v_views.relname, 'def', v_views.def,
      'opts', coalesce(array_to_string(v_views.reloptions, ', '), ''), 'acl', coalesce(v_views.relacl::text[], '{}'));
    -- hàm có kiểu trả về là hàng của view này
    v_funcs := v_funcs || coalesce((
      select jsonb_agg(jsonb_build_object('sig', p.oid::regprocedure::text, 'def', pg_get_functiondef(p.oid),
                                          'acl', coalesce(p.proacl::text[], '{}')))
      from pg_proc p where p.prorettype = v_views.reltype), '[]'::jsonb);
  end loop;

  select pg_get_functiondef(p.oid), p.proacl into v_sched, v_sched_acl
  from pg_proc p where p.oid = 'public.get_position_schedule(bigint, date)'::regprocedure;

  -- 2) Xóa tạm: hàm phụ thuộc → view → get_position_schedule (đổi kiểu trả về nên phải xóa)
  for x in select * from jsonb_array_elements(v_funcs) loop
    raise notice 'Tạm xóa hàm %', x->>'sig';
    execute 'drop function ' || (x->>'sig');
  end loop;
  for x in select * from jsonb_array_elements(v_saved) loop
    raise notice 'Tạm xóa view %.%', x->>'schema', x->>'name';
    execute format('drop view %I.%I', x->>'schema', x->>'name');
  end loop;
  drop function public.get_position_schedule(bigint, date);

  -- 3) Đổi kiểu cột
  alter table public.positions
    alter column open_hour type numeric(4,2),
    alter column close_hour type numeric(4,2),
    alter column max_shift_hours type numeric(4,2);
  alter table public.shifts
    alter column start_hour type numeric(4,2),
    alter column end_hour type numeric(4,2);

  -- 4) Tạo lại view + quyền
  for x in select * from jsonb_array_elements(v_saved) loop
    execute format('create view %I.%I %s as %s', x->>'schema', x->>'name',
      case when x->>'opts' <> '' then 'with (' || (x->>'opts') || ')' else '' end, x->>'def');
    -- acl rỗng = quyền mặc định của Supabase (tự áp khi tạo mới) → giữ nguyên
    if jsonb_array_length(x->'acl') > 0 then
      execute format('revoke all on %I.%I from public, anon, authenticated', x->>'schema', x->>'name');
    end if;
    for a in select * from aclexplode((select array_agg(t::aclitem) from jsonb_array_elements_text(x->'acl') t)) loop
      execute format('grant %s on %I.%I to %s', a.privilege_type, x->>'schema', x->>'name',
        case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end);
    end loop;
    raise notice 'Đã tạo lại view %.%', x->>'schema', x->>'name';
  end loop;

  -- 5) Tạo lại hàm phụ thuộc view + quyền
  for x in select * from jsonb_array_elements(v_funcs) loop
    execute x->>'def';
    if jsonb_array_length(x->'acl') > 0 then
      execute 'revoke all on function ' || (x->>'sig') || ' from public, anon, authenticated';
    end if;
    for a in select * from aclexplode((select array_agg(t::aclitem) from jsonb_array_elements_text(x->'acl') t)) loop
      execute format('grant %s on function %s to %s', a.privilege_type, x->>'sig',
        case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end);
    end loop;
    raise notice 'Đã tạo lại hàm %', x->>'sig';
  end loop;

  -- 6) get_position_schedule: giờ trả về numeric thay vì smallint
  if position('start_hour smallint, end_hour smallint' in v_sched) = 0 then
    raise exception 'get_position_schedule đã khác bản dự kiến – dừng lại để kiểm tra.';
  end if;
  execute replace(v_sched, 'start_hour smallint, end_hour smallint', 'start_hour numeric, end_hour numeric');
  if v_sched_acl is not null then
    revoke all on function public.get_position_schedule(bigint, date) from public, anon, authenticated;
    for a in select * from aclexplode(v_sched_acl) loop
      execute format('grant %s on function public.get_position_schedule(bigint, date) to %s', a.privilege_type,
        case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end);
    end loop;
  end if;
end $$;

-- 7) save_schedule: tổng giờ có phần lẻ (4.5 giờ) → numeric thay vì int
do $$
declare
  v_def text := pg_get_functiondef('public.save_schedule(bigint, date, jsonb)'::regprocedure);
begin
  if position('v_total int;' in v_def) = 0 then
    raise exception 'save_schedule đã khác bản dự kiến – dừng lại để kiểm tra.';
  end if;
  execute replace(v_def, 'v_total int;', 'v_total numeric;');  -- create or replace: giữ nguyên quyền
end $$;

-- 8) Giờ phải theo bước 15 phút, trong 00:00–24:00
alter table public.positions drop constraint if exists positions_hours_quarter;
alter table public.positions add constraint positions_hours_quarter check (
  (open_hour is null or (open_hour between 0 and 24 and open_hour * 4 = trunc(open_hour * 4)))
  and (close_hour is null or (close_hour between 0 and 24 and close_hour * 4 = trunc(close_hour * 4)))
);
alter table public.shifts drop constraint if exists shifts_hours_quarter;
alter table public.shifts add constraint shifts_hours_quarter check (
  start_hour between 0 and 24 and end_hour between 0 and 24
  and start_hour * 4 = trunc(start_hour * 4) and end_hour * 4 = trunc(end_hour * 4)
);

-- Báo PostgREST nạp lại cấu trúc mới
notify pgrst, 'reload schema';

commit;
