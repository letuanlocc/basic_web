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

  /**
   * Danh sách việc đang tuyển, tìm theo tên việc/quán/địa điểm/mô tả, lọc và phân trang.
   * loc (tùy chọn, từ NER): chỉ giữ tin có khu vực này trong địa chỉ/phường, không phân biệt dấu và hoa thường.
   */
  async search({ q = null, mode = null, sort = 'new', limit = 6, offset = 0, loc = null } = {}) {
    const today = new Date().toISOString().slice(0, 10);
    let query = this.db
      .from('position_overview')
      .select('*')
      .eq('is_open', true);
    if (mode) query = query.eq('mode', mode);
    if (q) {
      const term = q.replace(/[\\%_"]/g, '\\$&');
      const matches = `or(title.ilike."%${term}%",shop_name.ilike."%${term}%",address.ilike."%${term}%",summary.ilike."%${term}%")`;
      query = query.or(`and(deadline.is.null,${matches}),and(deadline.gte.${today},${matches})`);
    } else {
      query = query.or(`deadline.is.null,deadline.gte.${today}`);
    }
    if (sort === 'salary') {
      query = query.order('salary_amount', { ascending: false, nullsFirst: false });
    }
    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (!loc) return unwrap(await query.range(Number(offset), Number(offset) + Number(limit) - 1));

    // Có lọc khu vực: lấy tối đa 200 tin khớp từ khóa rồi lọc theo chuỗi địa chỉ trong Node.
    const plain = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
    const want = plain(loc);
    const rows = unwrap(await query.range(0, 199));
    return rows
      .filter((r) => plain([r.address, r.shop_ward, r.shop_city, r.shop_name].join(' ')).includes(want))
      .slice(Number(offset), Number(offset) + Number(limit));
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
    const shop = unwrap(
      await this.db.from('shops').select('id, name, mode, industry, address, ward, city, phone, fanpage_url, photos:shop_photos(url, caption, sort_order)')
        .eq('id', overview.shop_id).maybeSingle()
    );
    return { ...overview, items: unwrap(items), shifts: unwrap(shifts), shop };
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
module.exports.FIELDS = FIELDS;
