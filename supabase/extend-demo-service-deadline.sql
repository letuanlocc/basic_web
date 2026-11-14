-- Reopen only the seeded Cafe Moc service job for another 30 days.
-- Run in the Supabase SQL Editor as postgres. This does not change applications,
-- employment records, or any non-demo position.
begin;

do $$
declare
  v_today date := public.vn_today();
  v_job record;
begin
  select p.id, p.deadline, p.start_date, p.is_open
    into strict v_job
    from public.positions p
    join public.shops s on s.id = p.shop_id
    join auth.users a on a.id = s.owner_id
    where a.email = 'employer1@caranh-demo.test'
      and a.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
      and p.title = '[DEMO] Nhân viên phục vụ'
    for update of p;

  if v_job.is_open is distinct from true then
    raise exception 'Seeded Cafe Moc service position is closed; no changes made';
  end if;

  if v_job.deadline >= v_today then
    raise notice 'Seeded Cafe Moc service position is already within its application deadline';
  elsif v_job.start_date is distinct from v_job.deadline then
    raise exception 'Seeded position dates were changed; refusing to overwrite them';
  else
    update public.positions
      set deadline = v_today + 30,
          start_date = v_today + 31
      where id = v_job.id;
  end if;
end;
$$;

commit;
