// Mỗi request tạo bộ model gắn với client Supabase của chính user đó (xem middlewares/auth.js)
module.exports = (db) => ({
  users: new (require('./User'))(db),
  seekers: new (require('./SeekerProfile'))(db),
  shops: new (require('./Shop'))(db),
  positions: new (require('./Position'))(db),
  shifts: new (require('./Shift'))(db),
  applications: new (require('./Application'))(db),
  invitations: new (require('./Invitation'))(db),
  employments: new (require('./Employment'))(db),
  saved: new (require('./SavedJob'))(db),
});
