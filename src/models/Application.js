const { unwrap, httpError } = require('../utils/db');

const SEEKER = 'seeker:seeker_profiles(user_id, avatar_url, birth_year, gender, area, work_mode, availability_note, has_experience, language_level, user:users(id, full_name))';
const POSITION = 'position:positions(id, title, mode, shop:shops(id, name))';

/** Ứng tuyển. Ghi dữ liệu luôn qua RPC (client không insert thẳng vào bảng). */
class Application {
  constructor(db) {
    this.db = db;
  }

  async apply(positionId) {
    return unwrap(await this.db.rpc('apply_to_position', { p_position_id: positionId }));
  }

  async withdraw(applicationId) {
    unwrap(await this.db.rpc('withdraw_application', { p_application_id: applicationId }));
    return true;
  }

  /**
   * Gỡ đơn "accepted" của việc đã bị chủ quán xóa khỏi danh sách: chuyển sang "withdrawn" để danh sách sạch và
   * để ứng tuyển/nhận lời mời lại được. Chỉ đơn của chính người gọi, và chỉ khi không còn việc làm đang hiệu lực.
   * Dùng client admin vì RPC withdraw chỉ dành cho đơn đang chờ (không sửa trực tiếp bảng bằng quyền người dùng).
   */
  async dismissEnded(applicationId, seekerId, client = require('../config/supabase').admin) {
    const app = unwrap(await client.from('applications').select('id, status, position_id').eq('id', applicationId).eq('seeker_id', seekerId).maybeSingle());
    if (!app) throw httpError(404, 'Không tìm thấy hồ sơ');
    if (app.status !== 'accepted') throw httpError(409, 'Chỉ gỡ được hồ sơ của việc đã nghỉ.');
    const active = unwrap(await client.from('employments').select('id').eq('seeker_id', seekerId).eq('position_id', app.position_id).is('ended_at', null).limit(1));
    if (active.length) throw httpError(409, 'Bạn vẫn đang làm ở vị trí này nên không thể gỡ hồ sơ.');
    unwrap(await client.from('applications').update({ status: 'withdrawn' }).eq('id', app.id).eq('seeker_id', seekerId).eq('status', 'accepted'));
    return true;
  }

  /** Chủ quán nhận/từ chối. Trả { status, auto_rejected }. */
  async decide(applicationId, accept) {
    return unwrap(await this.db.rpc('decide_application', { p_application_id: applicationId, p_accept: !!accept }));
  }

  /** Hồ sơ tôi đã nộp. */
  async listMine(seekerId) {
    return unwrap(
      await this.db
        .from('applications')
        .select(`id, status, source, reject_reason, decided_at, created_at, ${POSITION}`)
        .eq('seeker_id', seekerId)
        .order('created_at', { ascending: false })
    );
  }

  /** Hồ sơ nộp vào một vị trí (chủ quán). */
  async listForPosition(positionId, status) {
    let q = this.db
      .from('applications')
      .select(`id, status, source, reject_reason, decided_at, created_at, ${SEEKER}`)
      .eq('position_id', positionId)
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    return unwrap(await q);
  }
}

module.exports = Application;
