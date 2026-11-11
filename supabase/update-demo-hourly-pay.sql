-- Demo-only hourly pay adjustment. Run in Supabase SQL Editor as postgres.
-- Changes only salary_amount and salary_unit for two seed-owned positions.
-- Transaction fails without changes if either record no longer matches expectations.
begin;
do $$
declare
  wanted record;
  current_job record;
begin
  for wanted in
    select * from (values
      ('employer1@caranh-demo.test', '[DEMO] Nhân viên thu ngân', 7500000, 30000),
      ('employer3@caranh-demo.test', '[DEMO] Nhân viên bán hàng', 7200000, 25000)
    ) as expected(email, title, old_amount, new_amount)
  loop
    select p.id, p.salary_amount, p.salary_unit
      into strict current_job
      from public.positions p
      join public.shops s on s.id = p.shop_id
      join auth.users a on a.id = s.owner_id
      where a.email = wanted.email
        and a.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
        and p.title = wanted.title
      for update of p;
    if not (
      (current_job.salary_unit = 'month' and current_job.salary_amount = wanted.old_amount)
      or (current_job.salary_unit = 'hour' and current_job.salary_amount = wanted.new_amount)
    ) then
      raise exception 'Demo salary was changed by another user; stopped for position %', current_job.id;
    end if;
    if current_job.salary_unit <> 'hour' or current_job.salary_amount <> wanted.new_amount then
      update public.positions set salary_amount = wanted.new_amount, salary_unit = 'hour'
      where id = current_job.id;
    end if;
  end loop;
end;
$$;
commit;
