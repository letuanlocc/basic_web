const { unwrap } = require('../utils/db');

class SavedJob {
  constructor(db) {
    this.db = db;
  }

  async list(seekerId) {
    return unwrap(
      await this.db
        .from('saved_jobs')
        .select('created_at, position:positions(id, title, mode, salary_amount, salary_unit, deadline, is_open, shop:shops(id, name))')
        .eq('seeker_id', seekerId)
        .order('created_at', { ascending: false })
    );
  }

  async save(seekerId, positionId) {
    unwrap(await this.db.from('saved_jobs').upsert({ seeker_id: seekerId, position_id: positionId }).select('position_id'));
    return true;
  }

  async unsave(seekerId, positionId) {
    unwrap(await this.db.from('saved_jobs').delete().eq('seeker_id', seekerId).eq('position_id', positionId));
    return true;
  }
}

module.exports = SavedJob;
