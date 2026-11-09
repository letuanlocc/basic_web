const { unwrap, pick } = require('../utils/db');

const FIELDS = [
  'avatar_url', 'birth_year', 'gender', 'area', 'work_mode', 'availability_note',
  'has_experience', 'experience', 'language_level', 'strengths', 'improvements',
];
const SELECT = '*, availability:seeker_availability(slot)';

class SeekerProfile {
  constructor(db) {
    this.db = db;
  }

  async get(userId) {
    return unwrap(await this.db.from('seeker_profiles').select(SELECT).eq('user_id', userId).maybeSingle());
  }

  async update(userId, body) {
    const patch = pick(body, FIELDS);
    if (Object.keys(patch).length) {
      unwrap(await this.db.from('seeker_profiles').update(patch).eq('user_id', userId).select('user_id').single());
    }
    return this.get(userId);
  }

  /** Thay toàn bộ khung giờ rảnh: morning | afternoon | evening | weekend. */
  async setAvailability(userId, slots) {
    unwrap(await this.db.from('seeker_availability').delete().eq('seeker_id', userId));
    const rows = [...new Set(slots)].map((slot) => ({ seeker_id: userId, slot }));
    if (rows.length) unwrap(await this.db.from('seeker_availability').insert(rows).select('slot'));
    return this.get(userId);
  }

  /** Đủ 7 ô bắt buộc mới được ứng tuyển. */
  async isComplete(userId) {
    return unwrap(await this.db.rpc('is_profile_complete', { p_uid: userId }));
  }
}

module.exports = SeekerProfile;
