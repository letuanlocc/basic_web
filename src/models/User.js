const { unwrap, pick } = require('../utils/db');

// Client chỉ được đọc id, full_name, role. SĐT/email lấy qua rpc get_user_contact.
class User {
  constructor(db) {
    this.db = db;
  }

  async getPublic(id) {
    return unwrap(await this.db.from('users').select('id, full_name, role').eq('id', id).maybeSingle());
  }

  /** SĐT + email: chính mình, hoặc chủ quán có đơn/lời mời/nhân viên là người đó. */
  async getContact(id) {
    const rows = unwrap(await this.db.rpc('get_user_contact', { p_user_id: id }));
    return rows?.[0] ?? null;
  }

  async updateMe(id, body) {
    return unwrap(
      await this.db.from('users').update(pick(body, ['full_name', 'phone'])).eq('id', id).select('id, full_name, role').single()
    );
  }
}

module.exports = User;
