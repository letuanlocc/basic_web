const { unwrap, pick } = require('../utils/db');

// Bảng positions KHÔNG cho select contact_name/contact_phone và không dùng '*'.
const FIELDS = [
  'title', 'mode', 'salary_amount', 'salary_unit', 'summary', 'address', 'work_form',
  'no_experience', 'accepts_intern', 'headcount', 'pending_limit', 'work_days',
  'open_hour', 'close_hour', 'min_week_hours', 'max_week_hours', 'max_day_hours',
  'max_shift_hours', 'max_per_shift', 'min_per_shift', 'deadline', 'start_date',
  'contact_name', 'contact_phone', 'schedule_note', 'is_open',
];

class Position {
  constructor(db) {
    this.db = db;
  }

  /** Danh sách việc (không dấu, lọc hình thức, sắp xếp 'new' | 'salary', phân trang). */
  async search({ q = null, mode = null, sort = 'new', limit = 6, offset = 0 } = {}) {
    return unwrap(
      await this.db.rpc('search_positions', {
        p_q: q || null,
        p_mode: mode || null,
        p_sort: sort,
        p_limit: Number(limit),
        p_offset: Number(offset),
      })
    );
  }

  async overview(id) {
    return unwrap(await this.db.from('position_overview').select('*').eq('id', id).maybeSingle());
  }

  /** Chi tiết: overview + công việc/yêu cầu/quyền lợi + các ca đang dùng. */
  async detail(id) {
    const [overview, items, shifts] = await Promise.all([
      this.overview(id),
      this.db.from('position_items').select('id, kind, content, sort_order').eq('position_id', id).order('sort_order'),
      this.db.from('shifts').select('id, name, start_hour, end_hour, sort_order').eq('position_id', id).is('archived_at', null).order('sort_order'),
    ]);
    if (!overview) return null;
    return { ...overview, items: unwrap(items), shifts: unwrap(shifts) };
  }

  async listByShop(shopId) {
    return unwrap(await this.db.from('position_overview').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }));
  }

  /** items: [{ kind: 'task'|'requirement'|'perk', content }] */
  async create(shopId, body, items = []) {
    const row = unwrap(
      await this.db.from('positions').insert({ ...pick(body, FIELDS), shop_id: shopId }).select('id').single() // không .select() cột liên hệ
    );
    if (items.length) await this.replaceItems(row.id, items);
    return this.detail(row.id);
  }

  async update(id, body) {
    const patch = pick(body, FIELDS);
    if (Object.keys(patch).length) {
      unwrap(await this.db.from('positions').update(patch).eq('id', id).select('id').single());
    }
    return this.detail(id);
  }

  async setOpen(id, isOpen) {
    return this.update(id, { is_open: !!isOpen });
  }

  async replaceItems(positionId, items) {
    unwrap(await this.db.from('position_items').delete().eq('position_id', positionId));
    const rows = items.map((it, i) => ({
      position_id: positionId,
      kind: it.kind,
      content: it.content,
      sort_order: it.sort_order ?? i,
    }));
    if (rows.length) unwrap(await this.db.from('position_items').insert(rows).select('id'));
    return true;
  }

  /** Người liên hệ phỏng vấn: chỉ chủ quán hoặc người đã nộp hồ sơ / đang làm. */
  async getContact(id) {
    const rows = unwrap(await this.db.rpc('get_position_contact', { p_position_id: id }));
    return rows?.[0] ?? null;
  }
}

module.exports = Position;
