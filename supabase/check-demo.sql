-- Read-only checks for CaRảnh demo v1. Run in SQL Editor as postgres.
-- No INSERT, UPDATE, DELETE, RESET, schema changes or credential values.

-- 1. Initial expected counts (extra rows created while using the demo are shown).
with demo_users as (
  select u.* from public.users u join auth.users a on a.id = u.id
  where a.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
), demo_shops as (
  select s.* from public.shops s join demo_users u on u.id = s.owner_id
), demo_positions as (
  select p.* from public.positions p join demo_shops s on s.id = p.shop_id
)
select 'users' as dataset, count(*) as actual, 6 as expected from demo_users
union all select 'seeker users', count(*), 2 from demo_users where role = 'seeker'
union all select 'employer users', count(*), 4 from demo_users where role = 'employer'
union all select 'shops', count(*), 4 from demo_shops
union all select 'shop_photos', count(*), 4 from public.shop_photos where shop_id in (select id from demo_shops)
union all select 'seeker_profiles', count(*), 2 from public.seeker_profiles where user_id in (select id from demo_users)
union all select 'seeker_availability', count(*), 6 from public.seeker_availability where seeker_id in (select id from demo_users)
union all select 'positions', count(*), 5 from demo_positions
union all select 'position_items', count(*), 15 from public.position_items where position_id in (select id from demo_positions)
union all select 'shifts', count(*), 10 from public.shifts where position_id in (select id from demo_positions) and archived_at is null
union all select 'applications', count(*), 4 from public.applications where position_id in (select id from demo_positions) and seeker_id in (select id from demo_users)
union all select 'invitations', count(*), 3 from public.invitations where position_id in (select id from demo_positions) and seeker_id in (select id from demo_users)
union all select 'active employments', count(*), 1 from public.employments where position_id in (select id from demo_positions) and seeker_id in (select id from demo_users) and ended_at is null
union all select 'saved_jobs', count(*), 4 from public.saved_jobs where position_id in (select id from demo_positions) and seeker_id in (select id from demo_users)
order by dataset;

-- 2. Inspect all four application states and their sources/rejection reasons.
select u.full_name as seeker, p.title, a.status, a.source, a.reject_reason,
       a.created_at, a.decided_at
from public.applications a
join public.users u on u.id = a.seeker_id
join auth.users au on au.id = u.id
join public.positions p on p.id = a.position_id
join public.shops s on s.id = p.shop_id
join auth.users owner_auth on owner_auth.id = s.owner_id
where au.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
  and owner_auth.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
order by p.id, a.id;

-- 3. Inspect all three invitation states. Accepted invitation has pending invite-source application.
select u.full_name as seeker, p.title, i.status as invitation_status,
       a.status as application_status, a.source
from public.invitations i
join public.users u on u.id = i.seeker_id
join auth.users au on au.id = u.id
join public.positions p on p.id = i.position_id
join public.shops s on s.id = p.shop_id
join auth.users owner_auth on owner_auth.id = s.owner_id
left join public.applications a on a.position_id = i.position_id and a.seeker_id = i.seeker_id
where au.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
  and owner_auth.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
order by i.id;

-- 4. One active employee, tied to the correct accepted application.
select u.full_name, p.title, e.started_at, e.ended_at, a.status,
       (a.status = 'accepted' and a.position_id = e.position_id
        and a.seeker_id = e.seeker_id) as linked_correctly
from public.employments e
join public.users u on u.id = e.seeker_id
join auth.users au on au.id = u.id
join public.positions p on p.id = e.position_id
left join public.applications a on a.id = e.application_id
where au.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
  and e.ended_at is null;

-- 5. Distinguish employment form and online/offline mode; dates remain visible after expiration.
select p.title, p.work_form, p.mode, p.salary_amount, p.salary_unit,
       p.deadline, p.start_date, p.is_open,
       (p.is_open and p.deadline >= public.vn_today()) as within_deadline
from public.positions p
join public.shops s on s.id = p.shop_id
join auth.users au on au.id = s.owner_id
where au.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
order by p.id;

-- 6. Weekly schedules. weekday 0 = Monday, 6 = Sunday.
select u.full_name, p.title, a.week_start, a.weekday,
       a.week_start + a.weekday as work_date,
       sh.name, sh.start_hour, sh.end_hour
from public.shift_assignments a
join public.employments e on e.id = a.employment_id
join public.users u on u.id = e.seeker_id
join auth.users au on au.id = u.id
join public.positions p on p.id = a.position_id
join public.shifts sh on sh.id = a.shift_id
where au.raw_app_meta_data ->> 'caranh_seed' = 'caranh-demo-v1'
order by a.week_start, a.weekday, sh.start_hour;
