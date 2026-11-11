const { unwrap } = require('../utils/db');

/** Nhân viên đang làm ở một vị trí + lịch ca theo tuần. */
class Employment {
  constructor(db) {
    this.db = db;
  }

  /** Việc tôi đang làm. */
  async listMine(seekerId) {
    return unwrap(
      await this.db
        .from('employments')
        .select('id, started_at, position:positions(id, title, mode, min_week_hours, max_week_hours, shop:shops(id, name))')
        .eq('seeker_id', seekerId)
        .is('ended_at', null)
    );
  }

  /** Nhân viên của một vị trí (chủ quán). */
  async listForPosition(positionId) {
    return unwrap(
      await this.db
        .from('employments')
        .select('id, started_at, seeker:seeker_profiles(user_id, avatar_url, user:users(id, full_name))')
        .eq('position_id', positionId)
        .is('ended_at', null)
    );
  }

  /** Xóa khỏi danh sách: xóa ca từ tuần này trở đi, giữ lịch sử. */
  async remove(employmentId) {
    unwrap(await this.db.rpc('remove_employee', { p_employment_id: employmentId }));
    return true;
  }

  /**
   * Lưu lịch MỘT tuần (weekStart = thứ Hai tuần này/tuần sau).
   * cells = [{ shift_id, weekday }] là toàn bộ ô đang chọn của tuần đó.
   * Trả { total_hours, below_min_week, understaffed, ... } (cảnh báo, không chặn).
   */
  async saveSchedule(employmentId, weekStart, cells) {
    return unwrap(
      await this.db.rpc('save_schedule_exclusive', { p_employment_id: employmentId, p_week_start: weekStart, p_cells: cells })
    );
  }

  /** Lưới lịch cả tuần của một vị trí (chủ quán hoặc nhân viên của vị trí đó). */
  async getSchedule(positionId, weekStart) {
    return unwrap(await this.db.rpc('get_position_schedule', { p_position_id: positionId, p_week_start: weekStart }));
  }
}

module.exports = Employment;
