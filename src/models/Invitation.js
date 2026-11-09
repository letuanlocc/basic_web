const { unwrap } = require('../utils/db');

class Invitation {
  constructor(db) {
    this.db = db;
  }

  /** Chủ quán mời ứng viên vào một vị trí. */
  async send(positionId, seekerId, message = null) {
    return unwrap(await this.db.rpc('send_invitation', { p_position_id: positionId, p_seeker_id: seekerId, p_message: message }));
  }

  /** Ứng viên nhận (→ tự tạo hồ sơ ứng tuyển, trả application id) hoặc từ chối (→ null). */
  async respond(invitationId, accept) {
    return unwrap(await this.db.rpc('respond_invitation', { p_invitation_id: invitationId, p_accept: !!accept }));
  }

  async listMine(seekerId, status = 'pending') {
    return unwrap(
      await this.db
        .from('invitations')
        .select('id, message, status, created_at, position:positions(id, title, mode, shop:shops(id, name))')
        .eq('seeker_id', seekerId)
        .eq('status', status)
        .order('created_at', { ascending: false })
    );
  }
}

module.exports = Invitation;
