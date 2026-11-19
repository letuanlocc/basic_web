const { unwrap, httpError } = require('../utils/db');

/** Nhân viên đang làm ở một vị trí + lịch ca theo tuần. */
class Employment {
  constructor(db) {
    this.db = db;
  }

  /**
   * Nhân viên chỉ đăng ký/sửa lịch được khi việc còn hiệu lực. Chủ quán xóa nhân viên (ended_at) thì chặn ngay ở đây,
   * không phụ thuộc vào bản hàm SQL đang chạy trong database.
   */
  async assertActive(employmentId, seekerId) {
    const row = unwrap(
      await this.db.from('employments').select('id').eq('id', employmentId).eq('seeker_id', seekerId).is('ended_at', null).maybeSingle()
    );
    if (!row) throw httpError(403, 'Bạn không còn làm ở vị trí này nên không thể đăng ký lịch làm.');
  }

  /** Việc tôi đang làm. */
  async listMine(seekerId) {
    return unwrap(
      await this.db
        .from('employments')
        .select('id, started_at, position:positions(id, title, mode, min_week_hours, max_week_hours, max_day_hours, schedule_note, shop:shops(id, name))')
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

  /** Chủ quán: các ô (ca, thứ) một nhân viên đang giữ trong tuần. */
  async getCells(employmentId, weekStart) {
    return unwrap(await this.db.rpc('get_employment_cells', { p_employment_id: employmentId, p_week_start: weekStart }));
  }

  /** Chủ quán: thay toàn bộ ca của một nhân viên trong tuần (được vượt giới hạn người/giờ). */
  async manageSchedule(employmentId, weekStart, cells, force = false) {
    return unwrap(await this.db.rpc('manage_schedule', { p_employment_id: employmentId, p_week_start: weekStart, p_cells: cells, p_force: !!force }));
  }

  /** Nhân viên báo bận theo ca: thay toàn bộ ca bận của một việc trong một tuần. cells = [{ shift_id, weekday }]. */
  async setBusySlots(employmentId, weekStart, cells) {
    return unwrap(await this.db.rpc('set_my_busy_slots', { p_employment_id: employmentId, p_week_start: weekStart, p_cells: cells }));
  }

  /** Ca nhân viên đang giữ ở việc khác trong tuần (nhân viên đó hoặc chủ quán gọi). */
  async getBusy(employmentId, weekStart) {
    return unwrap(await this.db.rpc('employment_busy', { p_employment_id: employmentId, p_week_start: weekStart }));
  }

  /** Lưới lịch cả tuần của một vị trí (chủ quán hoặc nhân viên của vị trí đó). */
  async getSchedule(positionId, weekStart) {
    return unwrap(await this.db.rpc('get_position_schedule', { p_position_id: positionId, p_week_start: weekStart }));
  }
}

module.exports = Employment;
