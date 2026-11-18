'use strict';

// CaRảnh SQL v2 (09/11/2026). Run from the repository root.
// No arguments / --plan: offline preview. --apply: add missing demo data.
// --check: read-only database checks. Never deletes/resets database records.
const path = require('node:path');
const fs = require('node:fs');
const SEED = 'caranh-demo-v1';
const PROJECT = 'uhaakvedcnodndhpvurt';
const SQL_SHA256 = '50500689c7cca1040cd11290074f5f658487059c070dea6622e22c89f62cd014';
const AUTH_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

const ACCOUNTS = [
  { key: 's1', email: 'seeker1@caranh-demo.test', full_name: '[DEMO] Nguyễn Minh An', phone: '0000000101', role: 'seeker' },
  { key: 's2', email: 'seeker2@caranh-demo.test', full_name: '[DEMO] Trần Gia Linh', phone: '0000000102', role: 'seeker' },
  { key: 'e1', email: 'employer1@caranh-demo.test', full_name: '[DEMO] Lê Hoàng Mộc', phone: '0000000201', role: 'employer' },
  { key: 'e2', email: 'employer2@caranh-demo.test', full_name: '[DEMO] Phạm Bảo An', phone: '0000000202', role: 'employer' },
  { key: 'e3', email: 'employer3@caranh-demo.test', full_name: '[DEMO] Võ Thanh Hà', phone: '0000000203', role: 'employer' },
  { key: 'e4', email: 'employer4@caranh-demo.test', full_name: '[DEMO] Đặng Hải Vân', phone: '0000000204', role: 'employer' },
];
const SHOPS = [
  { owner: 'e1', slug: 'moc', name: '[DEMO] Cà phê Mộc', industry: 'Cà phê', mode: 'offline' },
  { owner: 'e2', slug: 'bep-an', name: '[DEMO] Bếp An', industry: 'Ăn uống', mode: 'offline' },
  { owner: 'e3', slug: 'tiem-la', name: '[DEMO] Tiệm Lá', industry: 'Bán lẻ', mode: 'offline' },
  { owner: 'e4', slug: 'studio-may', name: '[DEMO] Studio Mây', industry: 'Truyền thông', mode: 'online' },
];
const JOBS = [
  { key: 'p1', owner: 'e1', title: '[DEMO] Nhân viên phục vụ', work_form: 'Part-time', salary_amount: 25000, salary_unit: 'hour', task: 'Đón khách, nhận món và phục vụ đồ uống.', requirement: 'Đúng giờ, lịch sự, có thể làm ca sáng hoặc tối.', perk: 'Được hướng dẫn công việc và hỗ trợ đồ uống trong ca.' },
  { key: 'p2', owner: 'e1', title: '[DEMO] Nhân viên thu ngân', work_form: 'Full-time', salary_amount: 7500000, salary_unit: 'month', task: 'Nhận thanh toán và đối soát doanh thu cuối ca.', requirement: 'Cẩn thận, trung thực, sử dụng máy tính cơ bản.', perk: 'Được đào tạo sử dụng phần mềm bán hàng.' },
  { key: 'p3', owner: 'e2', title: '[DEMO] Nhân viên phụ bếp', work_form: 'Part-time', salary_amount: 28000, salary_unit: 'hour', task: 'Sơ chế nguyên liệu và giữ vệ sinh khu vực bếp.', requirement: 'Gọn gàng, chịu khó, tuân thủ hướng dẫn vệ sinh.', perk: 'Hỗ trợ bữa ăn trong ca làm việc.' },
  { key: 'p4', owner: 'e3', title: '[DEMO] Nhân viên bán hàng', work_form: 'Full-time', salary_amount: 7200000, salary_unit: 'month', task: 'Tư vấn sản phẩm và sắp xếp hàng hóa.', requirement: 'Giao tiếp rõ ràng, thân thiện với khách hàng.', perk: 'Được đào tạo kiến thức sản phẩm và kỹ năng tư vấn.' },
  { key: 'p5', owner: 'e4', title: '[DEMO] Cộng tác viên nội dung', work_form: 'Part-time', salary_amount: 35000, salary_unit: 'hour', task: 'Viết nội dung mạng xã hội theo kế hoạch được giao.', requirement: 'Viết tiếng Việt rõ ràng, có máy tính và Internet.', perk: 'Làm việc online theo ca, được góp ý nội dung.' },
];
const EXPECTED_APPLICATIONS = [
  { seeker: 's1', job: 'p1', status: 'accepted', source: 'direct' },
  { seeker: 's1', job: 'p2', status: 'rejected', source: 'direct', reject_reason: 'employer' },
  { seeker: 's2', job: 'p3', status: 'withdrawn', source: 'direct' },
  { seeker: 's2', job: 'p4', status: 'pending', source: 'invite' },
];
const EXPECTED_INVITATIONS = [
  { seeker: 's2', job: 'p4', status: 'accepted' },
  { seeker: 's1', job: 'p5', status: 'pending' },
  { seeker: 's1', job: 'p3', status: 'declined' },
];
const SAVED = [{ seeker: 's1', job: 'p3' }, { seeker: 's1', job: 'p5' }, { seeker: 's2', job: 'p1' }, { seeker: 's2', job: 'p5' }];

function invariant(ok, message) { if (!ok) throw new Error(message); }
function datePlus(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  invariant(/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === date, 'Ngày không hợp lệ.');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function weekDates(today) {
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = datePlus(today, -weekday);
  return { weekday, monday, nextMonday: datePlus(monday, 7) };
}
function jobBody(job, shop, owner, today) {
  const fullTime = job.work_form === 'Full-time';
  // p1 already has an active employee. Its advertised start date is today;
  // SQL v2 requires start_date >= deadline, so its deadline is also today.
  const deadline = job.key === 'p1' ? today : datePlus(today, 30);
  return {
    title: job.title, mode: shop.mode, work_form: job.work_form,
    salary_amount: job.salary_amount, salary_unit: job.salary_unit,
    summary: 'Tin tuyển minh họa của CaRảnh, không phải thông tin tuyển dụng thật.',
    address: shop.mode === 'offline' ? 'Địa chỉ minh họa, Đà Nẵng' : null,
    no_experience: true, accepts_intern: !fullTime, headcount: 3, pending_limit: 10,
    work_days: [0, 1, 2, 3, 4, 5, 6], open_hour: 6, close_hour: 22,
    min_week_hours: fullTime ? 40 : 12, max_week_hours: fullTime ? 48 : 24,
    max_day_hours: fullTime ? 8 : 4, max_shift_hours: fullTime ? 8 : 4,
    min_per_shift: 1, max_per_shift: 2, deadline,
    start_date: job.key === 'p1' ? today : datePlus(deadline, 1),
    contact_name: owner.full_name, contact_phone: owner.phone,
    schedule_note: 'Dữ liệu minh họa. Đăng ký ca riêng theo từng tuần.', is_open: true,
  };
}
function shiftsFor(job) {
  return job.work_form === 'Full-time'
    ? [{ name: 'Ca sáng', start_hour: 6, end_hour: 14, sort_order: 0 }, { name: 'Ca tối', start_hour: 14, end_hour: 22, sort_order: 1 }]
    : [{ name: 'Ca sáng', start_hour: 8, end_hour: 12, sort_order: 0 }, { name: 'Ca tối', start_hour: 18, end_hour: 22, sort_order: 1 }];
}
async function unwrap(operation, label) {
  const { data, error } = await operation;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function rows(client, table, filters, columns) {
  let query = client.from(table).select(columns);
  for (const [field, value] of Object.entries(filters)) query = query.eq(field, value);
  return unwrap(query, `Đọc ${table}`);
}
function oneOrNone(data, label) {
  invariant(data.length <= 1, `${label}: có nhiều bản ghi cùng cặp. Dừng để tránh tạo thêm.`);
  return data[0] || null;
}
async function rpc(client, name, args) { return unwrap(client.rpc(name, args), name); }
function missingFields(current, desired) {
  return Object.fromEntries(Object.entries(desired).filter(([key]) => current[key] === null || current[key] === undefined || current[key] === ''));
}
async function findAccounts(admin) {
  const found = new Map();
  for (let page = 1; ; page++) {
    const data = await unwrap(admin.auth.admin.listUsers({ page, perPage: 100 }), 'Đọc tài khoản Auth');
    for (const user of data.users) if (ACCOUNTS.some(a => a.email === user.email)) found.set(user.email, user);
    if (data.users.length < 100) break;
  }
  for (const account of ACCOUNTS) {
    const existing = found.get(account.email);
    if (!existing) continue;
    invariant(existing.app_metadata?.caranh_seed === SEED, `Email ${account.email} đã tồn tại nhưng không thuộc bộ seed này. Không sửa tài khoản đó.`);
    invariant(existing.user_metadata?.role === account.role && existing.user_metadata?.phone === account.phone,
      `Metadata của ${account.email} đã thay đổi. Kiểm tra trước khi tiếp tục.`);
  }
  return found;
}
function config(env, needsPassword) {
  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: publicKey, SUPABASE_SECRET_KEY: secretKey, DEMO_SEED_PASSWORD: password } = env;
  invariant(url && publicKey && secretKey, 'Thiếu SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY hoặc SUPABASE_SECRET_KEY trong .env.');
  const target = new URL(url);
  invariant(target.origin === `https://${PROJECT}.supabase.co` && /^\/?$/.test(target.pathname) && !target.search && !target.hash && !target.username && !target.password,
    `Script này chỉ dành cho project ${PROJECT}. Không trỏ sang project khác.`);
  if (needsPassword) invariant(password && password.length >= 12, 'Đặt DEMO_SEED_PASSWORD ít nhất 12 ký tự trong .env trên máy bạn.');
  return { url: target.origin, publicKey, secretKey, password };
}
async function preflight(admin, anon) {
  const required = {
    users: 'id,role,email,phone', seeker_profiles: 'user_id,birth_year,work_mode,language_level',
    seeker_availability: 'seeker_id,slot', shops: 'id,owner_id,name,mode', shop_photos: 'id,shop_id,url',
    positions: 'id,shop_id,title,work_form,salary_amount,salary_unit,work_days,deadline,start_date',
    position_items: 'id,position_id,kind,content', shifts: 'id,position_id,name,start_hour,end_hour,archived_at',
    applications: 'id,position_id,seeker_id,status,source,reject_reason', invitations: 'id,position_id,seeker_id,status',
    employments: 'id,position_id,seeker_id,application_id,ended_at', saved_jobs: 'seeker_id,position_id',
    shift_assignments: 'id,employment_id,position_id,shift_id,week_start,weekday',
  };
  for (const [table, columns] of Object.entries(required)) await unwrap(admin.from(table).select(columns).limit(1), `Schema ${table}`);
  const today = await rpc(anon, 'vn_today');
  datePlus(today, 0);
  await rpc(anon, 'search_positions', { p_q: '[DEMO]', p_limit: 1 });
  return today;
}
async function prepareAccounts(admin, anon, makeClient, settings) {
  const existing = await findAccounts(admin);
  const people = {};
  // Validate existing logins and phone collisions before creating any accounts.
  for (const account of ACCOUNTS) {
    if (existing.has(account.email)) {
      const client = makeClient();
      await unwrap(client.auth.signInWithPassword({ email: account.email, password: settings.password }), `Đăng nhập ${account.email} (giữ nguyên mật khẩu lúc seed lần đầu)`);
      people[account.key] = { ...account, id: existing.get(account.email).id, client };
    } else {
      invariant(await rpc(anon, 'phone_available', { p_phone: account.phone }), `Số minh họa của ${account.email} đã được dùng. Không ghi đè.`);
    }
  }
  for (const account of ACCOUNTS) {
    if (people[account.key]) continue;
    const data = await unwrap(admin.auth.admin.createUser({
      email: account.email, password: settings.password, email_confirm: true,
      user_metadata: { full_name: account.full_name, phone: account.phone, role: account.role },
      app_metadata: { caranh_seed: SEED },
    }), `Tạo Auth ${account.email}`);
    const client = makeClient();
    await unwrap(client.auth.signInWithPassword({ email: account.email, password: settings.password }), `Đăng nhập ${account.email}`);
    people[account.key] = { ...account, id: data.user.id, client };
    console.log(`Đã tạo ${account.email}`);
  }
  // Validate that Auth's trigger ran; never insert public.users manually.
  for (const person of Object.values(people)) {
    const row = oneOrNone(await rows(person.client, 'users', { id: person.id }, 'id,role'), person.email);
    invariant(row?.role === person.role, `Thiếu/sai public.users của ${person.email}. Kiểm tra trigger handle_new_user, không chạy reset.`);
  }
  return people;
}
async function prepareProfiles(people) {
  for (const key of ['s1', 's2']) {
    const person = people[key];
    const profile = oneOrNone(await rows(person.client, 'seeker_profiles', { user_id: person.id }, '*'), 'Hồ sơ');
    invariant(profile, 'Thiếu hồ sơ do trigger tạo.');
    const desired = {
      birth_year: key === 's1' ? 2004 : 2005, gender: key === 's1' ? 'male' : 'female', area: 'Đà Nẵng', work_mode: 'both',
      availability_note: key === 's1' ? 'Sáng và tối theo lịch học' : 'Buổi tối và cuối tuần',
      experience: 'Hồ sơ minh họa; sẵn sàng học việc.', strengths: 'Đúng giờ, hợp tác và có trách nhiệm.', improvements: 'Cần tích lũy thêm kinh nghiệm thực tế.',
    };
    const patch = missingFields(profile, desired);
    if (Object.keys(patch).length) await unwrap(person.client.from('seeker_profiles').update(patch).eq('user_id', person.id), 'Hoàn thiện hồ sơ');
    const availability = await rows(person.client, 'seeker_availability', { seeker_id: person.id }, 'slot');
    for (const slot of ['morning', 'evening', 'weekend']) if (!availability.some(a => a.slot === slot)) {
      await unwrap(person.client.from('seeker_availability').insert({ seeker_id: person.id, slot }), 'Thêm giờ rảnh');
    }
    invariant(await rpc(person.client, 'is_profile_complete', { p_uid: person.id }), 'Hồ sơ chưa đủ điều kiện ứng tuyển.');
  }
}
async function prepareShops(people) {
  const shops = {};
  for (const item of SHOPS) {
    const owner = people[item.owner];
    let shop = oneOrNone(await rows(owner.client, 'shops', { owner_id: owner.id }, '*'), 'Cửa hàng');
    invariant(shop, 'Thiếu cửa hàng do trigger tạo.');
    const desired = {
      name: item.name, mode: item.mode, industry: item.industry, address: 'Địa chỉ minh họa, Đà Nẵng',
      ward: 'Khu vực minh họa', city: 'Đà Nẵng', phone: owner.phone,
      description: 'Cửa hàng mẫu để kiểm thử CaRảnh. Không phải doanh nghiệp/tin tuyển dụng thật.',
    };
    const patch = missingFields(shop, desired);
    if (Object.keys(patch).length) await unwrap(owner.client.from('shops').update(patch).eq('id', shop.id), 'Hoàn thiện cửa hàng');
    const photoUrl = `/demo/shops/${item.slug}.svg`;
    const photos = await rows(owner.client, 'shop_photos', { shop_id: shop.id, url: photoUrl }, 'id');
    if (!photos.length) await unwrap(owner.client.from('shop_photos').insert({ shop_id: shop.id, url: photoUrl, caption: 'Ảnh minh họa', sort_order: 0 }), 'Thêm ảnh cửa hàng');
    invariant(await rpc(owner.client, 'is_shop_complete', { p_shop_id: shop.id }), 'Cửa hàng chưa đủ điều kiện đăng tin.');
    shop = oneOrNone(await rows(owner.client, 'shops', { id: shop.id }, '*'), 'Cửa hàng');
    shops[item.owner] = shop;
  }
  return shops;
}
async function prepareJobs(people, shops, today) {
  const positions = {};
  for (const job of JOBS) {
    const owner = people[job.owner];
    let position = oneOrNone(await rows(owner.client, 'positions', { shop_id: shops[job.owner].id, title: job.title }, 'id,mode,work_form,deadline'), job.title);
    if (!position) {
      const body = jobBody(job, shops[job.owner], owner, today);
      position = await unwrap(owner.client.from('positions').insert({ ...body, shop_id: shops[job.owner].id }).select('id,mode,work_form,deadline').single(), `Tạo ${job.title}`);
    }
    invariant(position.mode === shops[job.owner].mode && position.work_form === job.work_form, `${job.title} đã đổi hình thức. Kiểm tra trước khi seed tiếp.`);
    const items = await rows(owner.client, 'position_items', { position_id: position.id }, 'kind,content');
    for (const [kind, content] of [['task', job.task], ['requirement', job.requirement], ['perk', job.perk]]) {
      if (!items.some(i => i.kind === kind && i.content === content)) {
        await unwrap(owner.client.from('position_items').insert({ position_id: position.id, kind, content, sort_order: 0 }), 'Thêm nội dung tin');
      }
    }
    const shifts = {};
    for (const shift of shiftsFor(job)) {
      let current = oneOrNone(await rows(owner.client, 'shifts', { position_id: position.id, name: shift.name }, 'id,start_hour,end_hour,archived_at'), shift.name);
      if (!current) current = await unwrap(owner.client.from('shifts').insert({ ...shift, position_id: position.id }).select('id,start_hour,end_hour,archived_at').single(), 'Thêm ca');
      invariant(current.archived_at === null && current.start_hour === shift.start_hour && current.end_hour === shift.end_hour, 'Ca mẫu đã đổi hoặc lưu trữ. Không ghi đè ca.');
      shifts[shift.sort_order] = current.id;
    }
    positions[job.key] = { ...position, owner, shifts };
  }
  return positions;
}
async function ensureApplication(seeker, position, expected) {
  let application = oneOrNone(await rows(seeker.client, 'applications', { position_id: position.id, seeker_id: seeker.id }, 'id,status,source,reject_reason'), 'Đơn ứng tuyển');
  if (!application) {
    invariant(expected.source === 'direct', 'Lời mời đã nhận nhưng thiếu đơn ứng tuyển. Kiểm tra RPC trước khi tiếp tục.');
    const id = await rpc(seeker.client, 'apply_to_position', { p_position_id: position.id });
    application = { id, status: 'pending', source: 'direct' };
  }
  invariant(application.source === expected.source, 'Nguồn đơn ứng tuyển đã đổi.');
  if (application.status !== expected.status) {
    invariant(application.status === 'pending', `Đơn ${application.id} đang ${application.status}, khác mẫu ${expected.status}. Giữ nguyên và dừng.`);
    if (expected.status === 'withdrawn') await rpc(seeker.client, 'withdraw_application', { p_application_id: application.id });
    else await rpc(position.owner.client, 'decide_application', { p_application_id: application.id, p_accept: expected.status === 'accepted' });
  }
  return application.id;
}
async function ensureInvitation(seeker, position, status) {
  let invitation = oneOrNone(await rows(seeker.client, 'invitations', { position_id: position.id, seeker_id: seeker.id }, 'id,status'), 'Lời mời');
  if (!invitation) {
    const id = await rpc(position.owner.client, 'send_invitation', { p_position_id: position.id, p_seeker_id: seeker.id, p_message: '[DEMO] Mời bạn trao đổi về công việc và ca làm.' });
    invitation = { id, status: 'pending' };
  }
  if (invitation.status !== status) {
    invariant(invitation.status === 'pending', `Lời mời ${invitation.id} đã chuyển sang ${invitation.status}. Giữ nguyên và dừng.`);
    await rpc(seeker.client, 'respond_invitation', { p_invitation_id: invitation.id, p_accept: status === 'accepted' });
  }
}
async function prepareRelations(people, positions, today) {
  for (const expected of EXPECTED_APPLICATIONS.filter(a => a.source === 'direct')) {
    await ensureApplication(people[expected.seeker], positions[expected.job], expected);
  }
  for (const expected of EXPECTED_INVITATIONS) await ensureInvitation(people[expected.seeker], positions[expected.job], expected.status);
  await ensureApplication(people.s2, positions.p4, EXPECTED_APPLICATIONS[3]);
  for (const saved of SAVED) {
    const seeker = people[saved.seeker];
    const positionId = positions[saved.job].id;
    const existing = await rows(seeker.client, 'saved_jobs', { seeker_id: seeker.id, position_id: positionId }, 'position_id');
    if (!existing.length) await unwrap(seeker.client.from('saved_jobs').insert({ seeker_id: seeker.id, position_id: positionId }), 'Lưu tin');
  }
  const employment = oneOrNone(await rows(people.s1.client, 'employments', { seeker_id: people.s1.id, position_id: positions.p1.id }, 'id,ended_at'), 'Nhân viên');
  invariant(employment && employment.ended_at === null, 'Đơn được nhận phải có đúng một nhân viên đang làm.');
  const { weekday, monday, nextMonday } = weekDates(today);
  const schedules = [
    { week: nextMonday, weekdays: [0, 2, 4] },
    { week: monday, weekdays: [0, 1, 2, 3, 4, 5, 6].filter(d => d > weekday).slice(0, 3) },
  ];
  for (const schedule of schedules) if (schedule.weekdays.length) {
    // Resume after a failure between weeks; preserve each week's existing cells.
    const existing = await rows(people.s1.client, 'shift_assignments', { employment_id: employment.id, week_start: schedule.week }, 'id');
    if (!existing.length) {
      const result = await rpc(people.s1.client, 'save_schedule', {
        p_employment_id: employment.id, p_week_start: schedule.week,
        p_cells: schedule.weekdays.map((d, i) => ({ shift_id: positions.p1.shifts[i % 2], weekday: d })),
      });
      console.log(`Lịch ${schedule.week}: ${result.total_hours} giờ${result.below_min_week ? ' (cảnh báo dưới giờ tối thiểu; SQL cho phép)' : ''}.`);
    }
  }
}
async function check(admin, anon) {
  const found = await findAccounts(admin);
  invariant(found.size === 6, `Mới có ${found.size}/6 tài khoản mẫu. Chạy --apply để bổ sung.`);
  const people = Object.fromEntries(ACCOUNTS.map(a => [a.key, { ...a, id: found.get(a.email).id }]));
  const positions = {};
  for (const a of ACCOUNTS) {
    const user = oneOrNone(await rows(admin, 'users', { id: people[a.key].id }, 'id,role'), a.email);
    invariant(user?.role === a.role, `Sai vai của ${a.email}.`);
  }
  for (const item of SHOPS) {
    const shop = oneOrNone(await rows(admin, 'shops', { owner_id: people[item.owner].id }, 'id,mode'), item.name);
    invariant(shop && shop.mode === item.mode, `Thiếu/sai cửa hàng ${item.name}.`);
    invariant(await rpc(anon, 'is_shop_complete', { p_shop_id: shop.id }), `Hồ sơ ${item.name} chưa đủ.`);
    for (const job of JOBS.filter(j => j.owner === item.owner)) {
      const p = oneOrNone(await rows(admin, 'positions', { shop_id: shop.id, title: job.title }, 'id,work_form,mode,salary_amount,salary_unit'), job.title);
      invariant(p && p.work_form === job.work_form && p.mode === item.mode, `Thiếu/sai ${job.title}.`);
      invariant(p.salary_amount === job.salary_amount && p.salary_unit === job.salary_unit, `Sai mức lương/đơn vị lương của ${job.title}.`);
      const shifts = await rows(admin, 'shifts', { position_id: p.id }, 'id,name,archived_at,start_hour,end_hour');
      for (const shift of shiftsFor(job)) invariant(shifts.some(s => s.name === shift.name && s.archived_at === null && s.start_hour === shift.start_hour && s.end_hour === shift.end_hour), `Thiếu/sai ${shift.name} của ${job.title}.`);
      const items = await rows(admin, 'position_items', { position_id: p.id }, 'kind');
      invariant(['task', 'requirement', 'perk'].every(kind => items.some(i => i.kind === kind)), `Thiếu nội dung ${job.title}.`);
      positions[job.key] = p;
    }
  }
  for (const key of ['s1', 's2']) invariant(await rpc(anon, 'is_profile_complete', { p_uid: people[key].id }), `Hồ sơ ${key} chưa đủ.`);
  const applicationIds = {};
  for (const expected of EXPECTED_APPLICATIONS) {
    const app = oneOrNone(await rows(admin, 'applications', { seeker_id: people[expected.seeker].id, position_id: positions[expected.job].id }, 'id,status,source,reject_reason'), 'Đơn');
    invariant(app?.status === expected.status && app.source === expected.source && (app.reject_reason || null) === (expected.reject_reason || null), `Sai trạng thái/nguồn đơn ${expected.seeker}/${expected.job}.`);
    applicationIds[expected.job] = app.id;
  }
  for (const expected of EXPECTED_INVITATIONS) {
    const inv = oneOrNone(await rows(admin, 'invitations', { seeker_id: people[expected.seeker].id, position_id: positions[expected.job].id }, 'id,status'), 'Lời mời');
    invariant(inv?.status === expected.status, `Sai trạng thái lời mời ${expected.seeker}/${expected.job}.`);
  }
  const employees = await unwrap(admin.from('employments').select('id,position_id,seeker_id,application_id,ended_at').in('position_id', Object.values(positions).map(p => p.id)).in('seeker_id', [people.s1.id, people.s2.id]).is('ended_at', null), 'Kiểm tra nhân viên');
  invariant(employees.length === 1 && employees[0].seeker_id === people.s1.id && employees[0].position_id === positions.p1.id && employees[0].application_id === applicationIds.p1, 'Cần đúng 1 nhân viên mẫu đang làm, liên kết đúng đơn được nhận.');
  for (const saved of SAVED) invariant((await rows(admin, 'saved_jobs', { seeker_id: people[saved.seeker].id, position_id: positions[saved.job].id }, 'position_id')).length === 1, 'Thiếu tin đã lưu.');
  const cells = await rows(admin, 'shift_assignments', { employment_id: employees[0].id }, 'id');
  invariant(cells.length >= 3, 'Cần ít nhất 3 ô lịch của nhân viên mẫu.');
  console.log('ĐẠT: đủ các bản ghi mẫu: 6 tài khoản, 4 cửa hàng, 5 vị trí đúng lương/đơn vị, 10 ca; đủ 4 trạng thái đơn, 3 trạng thái lời mời, 1 nhân viên mẫu, 4 tin đã lưu và lịch mẫu. Giữ nguyên dữ liệu thử ngoài bộ mẫu.');
}
function printPlan() {
  console.log(`CaRảnh seed ${SEED}; project ${PROJECT}`);
  console.log('CHẾ ĐỘ XEM TRƯỚC: không kết nối hoặc ghi database.');
  console.table(ACCOUNTS.map(({ key, email, role }) => ({ key, email, role })));
  console.table(JOBS.map(({ key, title, work_form }) => ({ key, title, work_form })));
  console.table(EXPECTED_APPLICATIONS);
  console.table(EXPECTED_INVITATIONS);
  console.log('Chạy --apply để tạo mẫu; --check chỉ đọc và kiểm tra. Xem docs/seed-data.md trước khi chạy.');
}
async function main(args = process.argv.slice(2)) {
  invariant(args.length <= 1 && (!args.length || ['--plan', '--apply', '--check', '--help'].includes(args[0])), 'Dùng: node scripts/seed-demo.js [--plan|--apply|--check]');
  const mode = args[0] || '--plan';
  if (mode === '--plan' || mode === '--help') return printPlan();
  const root = path.resolve(__dirname, '..');
  require('dotenv').config({ path: path.join(root, '.env') });
  const settings = config(process.env, mode === '--apply');
  const { createClient } = require('@supabase/supabase-js');
  const makeClient = () => createClient(settings.url, settings.publicKey, AUTH_OPTIONS);
  const anon = makeClient();
  const admin = createClient(settings.url, settings.secretKey, AUTH_OPTIONS);
  const today = await preflight(admin, anon);
  if (mode === '--check') return check(admin, anon);
  for (const shop of SHOPS) invariant(fs.existsSync(path.join(root, 'public', 'demo', 'shops', `${shop.slug}.svg`)), 'Thiếu ảnh SVG mẫu. Chép cả thư mục public/demo trong gói ZIP vào repo.');
  console.log(`Đang seed project ${PROJECT}, ngày Việt Nam ${today}. Chỉ bổ sung dữ liệu của ${SEED}.`);
  const people = await prepareAccounts(admin, anon, makeClient, settings);
  await prepareProfiles(people);
  const shops = await prepareShops(people);
  const positions = await prepareJobs(people, shops, today);
  await prepareRelations(people, positions, today);
  await check(admin, anon);
}
if (require.main === module) main().catch(error => {
  // Never print environment values, clients, sessions or access/refresh tokens.
  console.error(`DỪNG: ${error.message}`);
  console.error('Các bước đã thành công được giữ lại. Sửa nguyên nhân rồi chạy lại; không dùng reset/xóa database.');
  process.exitCode = 1;
});
module.exports = { ACCOUNTS, SHOPS, JOBS, EXPECTED_APPLICATIONS, EXPECTED_INVITATIONS, SAVED, SQL_SHA256, config, datePlus, weekDates, jobBody, shiftsFor, missingFields, oneOrNone, ensureApplication, ensureInvitation, check, main };
