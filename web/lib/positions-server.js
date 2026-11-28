// Đọc tin tuyển công khai NGAY TRÊN MÁY CHỦ Next.js (Server Component), không đi qua trình duyệt.
// Chỉ import file này từ Server Component: nó dùng biến môi trường phía máy chủ.
//
// Dùng client ẩn danh (publishable key, role anon) nên RLS của Supabase vẫn áp dụng như bản Express:
// chỉ đọc view position_overview và các bảng công khai, không bao giờ select cột liên hệ của positions.
// Truy vấn giống Position.search / Position.detail trong src/models/Position.js.
//
// Chưa khai báo SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY thì đọc qua API Express (API_URL) ngay trên máy chủ.
// Lỗi thì trả null để trang tự tải lại ở trình duyệt như trước.
import { createClient } from '@supabase/supabase-js';
import { JOB_PAGE } from './format';

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
const API_URL = process.env.API_URL || 'http://localhost:3000';

const db = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

async function viaApi(path) {
  const r = await fetch(API_URL + path, { cache: 'no-store' });
  if (r.status === 404) return null;
  const j = await r.json();
  if (!j.success) throw new Error(j.message || 'Có lỗi xảy ra');
  return j.data;
}

/** Trang đầu danh sách việc đang tuyển, mới nhất trước (giống bộ lọc mặc định của JobList). */
export async function latestPositions() {
  try {
    if (!db) return await viaApi('/api/positions?limit=' + JOB_PAGE + '&offset=0&sort=new');
    const today = new Date().toISOString().slice(0, 10);
    return unwrap(await db.from('position_overview').select('*')
      .eq('is_open', true)
      .or(`deadline.is.null,deadline.gte.${today}`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, JOB_PAGE - 1));
  } catch (e) {
    console.error('[latestPositions]', e.message);
    return null;
  }
}

/** Chi tiết tin: overview + nhiệm vụ/yêu cầu/quyền lợi + ca đang dùng + cửa hàng. Không có tin thì trả 'missing'. */
export async function positionDetail(id) {
  if (!/^\d+$/.test(String(id))) return 'missing';
  try {
    if (!db) return (await viaApi('/api/positions/' + id)) || 'missing';
    const [overview, items, shifts] = await Promise.all([
      db.from('position_overview').select('*').eq('id', id).maybeSingle(),
      db.from('position_items').select('id, kind, content, sort_order').eq('position_id', id).order('sort_order'),
      db.from('shifts').select('id, name, start_hour, end_hour, sort_order').eq('position_id', id).is('archived_at', null).order('sort_order'),
    ]);
    const p = unwrap(overview);
    if (!p) return 'missing';
    const shop = unwrap(await db.from('shops')
      .select('id, name, mode, industry, address, ward, city, phone, fanpage_url, photos:shop_photos(url, caption, sort_order)')
      .eq('id', p.shop_id).maybeSingle());
    return { ...p, items: unwrap(items), shifts: unwrap(shifts), shop };
  } catch (e) {
    console.error('[positionDetail]', e.message);
    return null;
  }
}
