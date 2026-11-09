const { unwrap, pick } = require('../utils/db');

const FIELDS = ['name', 'start_hour', 'end_hour', 'sort_order'];
const SELECT = 'id, position_id, name, start_hour, end_hour, sort_order, archived_at';

class Shift {
  constructor(db) {
    this.db = db;
  }

  async listByPosition(positionId) {
    return unwrap(
      await this.db.from('shifts').select(SELECT).eq('position_id', positionId).is('archived_at', null).order('sort_order')
    );
  }

  async create(positionId, body) {
    return unwrap(await this.db.from('shifts').insert({ ...pick(body, FIELDS), position_id: positionId }).select(SELECT).single());
  }

  async update(id, body) {
    return unwrap(await this.db.from('shifts').update(pick(body, FIELDS)).eq('id', id).select(SELECT).single());
  }

  /** Không xóa cứng: đặt archived_at (bị chặn nếu còn người đăng ký tuần này/tuần sau). */
  async archive(id) {
    return unwrap(
      await this.db.from('shifts').update({ archived_at: new Date().toISOString() }).eq('id', id).select(SELECT).single()
    );
  }
}

module.exports = Shift;
