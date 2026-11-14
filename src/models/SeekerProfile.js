const { unwrap, pick, httpError } = require('../utils/db');
const { terms: searchTerms, matches: matchesCandidate } = require('../utils/candidate-search');

const FIELDS = [
  'avatar_url', 'birth_year', 'gender', 'area', 'work_mode', 'availability_note',
  'has_experience', 'experience', 'language_level', 'strengths', 'improvements',
];
const LIST_SELECT = '*, user:users(id, full_name), availability:seeker_availability(slot)';
const SELECT = '*, availability:seeker_availability(slot)';

class SeekerProfile {
  constructor(db) {
    this.db = db;
  }

  /** Hồ sơ kèm tên, dùng cho chủ quán xem chi tiết. */
  async getPublic(userId) {
    return unwrap(await this.db.from('seeker_profiles').select(LIST_SELECT).eq('user_id', userId).maybeSingle());
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

  /**
   * Danh sách ứng viên cho chủ quán. Lọc: work_mode (online|offline|both), slots (rảnh ít nhất một khung),
   * has_experience (true|false), area (chứa chuỗi). sort: updated | experience | age.
   */
  async search({ q: query = '', work_mode, slots, has_experience, area, min_lang, language_level, sort = 'updated', limit = 50 } = {}) {
    const words = searchTerms(query);
    const hasExactLanguage = language_level !== undefined && language_level !== '';
    if (hasExactLanguage && (!['string', 'number'].includes(typeof language_level) || !/^[0-3]$/.test(String(language_level)))) {
      throw httpError(400, 'Trình độ ngoại ngữ phải là một mức từ 0 đến 3.');
    }
    const want = String(slots || '').split(',').filter(Boolean);
    const take = Math.min(Math.max(Math.floor(Number(limit)) || 50, 1), 100);
    const pageSize = 200;
    const results = [];
    // Lọc từ khóa/giờ rảnh trước giới hạn kết quả, không chỉ tìm trong 50 hồ sơ đầu.
    // Giữ RLS và token người dùng; không dùng service-role để tìm hồ sơ.
    for (let offset = 0; ; offset += pageSize) {
      let q = this.db.from('seeker_profiles').select(LIST_SELECT);
      if (work_mode === 'online' || work_mode === 'offline') q = q.in('work_mode', [work_mode, 'both']);
      else if (work_mode === 'both') q = q.eq('work_mode', 'both');
      if (hasExactLanguage) q = q.eq('language_level', Number(language_level));
      if (Number(min_lang) > 0) q = q.gte('language_level', Number(min_lang));
      if (has_experience === 'true' || has_experience === 'false') q = q.eq('has_experience', has_experience === 'true');
      if (area) q = q.ilike('area', '%' + String(area).replace(/[%,()]/g, ' ') + '%');
      if (sort === 'experience') q = q.order('has_experience', { ascending: false }).order('updated_at', { ascending: false });
      else if (sort === 'age') q = q.order('birth_year', { ascending: false, nullsFirst: false });
      else q = q.order('updated_at', { ascending: false });
      q = q.order('user_id', { ascending: true }).range(offset, offset + pageSize - 1);
      const batch = unwrap(await q);
      for (const row of batch) {
        if (want.length && !(row.availability || []).some(a => want.includes(a.slot))) continue;
        if (!matchesCandidate(row, words)) continue;
        results.push(row);
        if (results.length === take) return results;
      }
      if (batch.length < pageSize) return results;
    }
  }

  /** Đủ 7 ô bắt buộc mới được ứng tuyển. */
  async isComplete(userId) {
    return unwrap(await this.db.rpc('is_profile_complete', { p_uid: userId }));
  }
}

module.exports = SeekerProfile;
