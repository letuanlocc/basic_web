const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/db');
const Google = require('../services/googleCalendar');
const Sync = require('../services/calendarSync');

const ok = (res, data) => res.json({ success: true, data });
const backToSchedule = (res, result) => res.redirect(303, '/schedule.html?google=' + result);

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Google chuyển hướng trực tiếp nên không có Bearer header. Xác minh state từ lần bắt đầu đã đăng nhập.
router.get('/callback', asyncHandler(async (req, res) => {
  const state = Google.consumeState(req, res);
  if (!state) return backToSchedule(res, 'expired');
  if (req.query.error === 'access_denied') return backToSchedule(res, 'cancelled');
  if (typeof req.query.code !== 'string' || req.query.error) return backToSchedule(res, 'error');

  try {
    await Sync.forUser(state.userId, async () => {
      const refreshToken = await Google.exchangeCode(req.query.code, state.codeVerifier);
      await Google.saveConnection(state.userId, refreshToken);
    });
    Sync.queueInitialSync(state.userId);
    return backToSchedule(res, 'connected');
  } catch {
    // Lỗi gốc từ OAuth có thể chứa code hoặc client secret.
    return backToSchedule(res, 'error');
  }
}));

router.use(requireAuth, requireRole('seeker'));

router.get('/connect', asyncHandler(async (req, res) =>
  ok(res, { url: await Google.startConnection(req.user.id, req, res) })));

router.get('/status', asyncHandler(async (req, res) =>
  ok(res, await Sync.getStatus(req.user.id))));

router.put('/settings', asyncHandler(async (req, res) => {
  Google.requireConfig();
  const enabled = req.body?.auto_sync_manager_changes;
  if (typeof enabled !== 'boolean') throw httpError(400, 'Cài đặt tự cập nhật phải là true hoặc false.');
  const userId = req.user.id;
  await Sync.forUser(userId, async () => {
    const connection = await Google.getConnection(userId);
    if (connection?.status !== 'active') throw httpError(409, 'Hãy kết nối Google Calendar trước.');
    await Google.updateConnection(userId, { auto_sync_manager_changes: enabled });
  });
  ok(res, await Sync.getStatus(userId));
}));

router.delete('/disconnect', asyncHandler(async (req, res) => {
  Google.requireConfig();
  await Sync.forUser(req.user.id, () => Google.disconnect(req.user.id));
  Google.clearState(res);
  ok(res, await Sync.getStatus(req.user.id));
}));

module.exports = router;
