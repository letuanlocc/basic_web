const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');

router.use(requireAuth);
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// Tài khoản + hồ sơ/cửa hàng của tôi
router.get('/', asyncHandler(async (req, res) => {
  const { m, user } = req;
  // các truy vấn độc lập chạy song song (mỗi lần gọi Supabase ~130ms)
  const [account, contact] = await Promise.all([m.users.getPublic(user.id), m.users.getContact(user.id)]);
  let extra;
  if (account?.role === 'employer') extra = { shop: await m.shops.getMine(user.id) };
  else {
    const [profile, profile_complete] = await Promise.all([m.seekers.get(user.id), m.seekers.isComplete(user.id)]);
    extra = { profile, profile_complete };
  }
  ok(res, { ...account, ...contact, ...extra });
}));

router.put('/', asyncHandler(async (req, res) => ok(res, await req.m.users.updateMe(req.user.id, req.body))));

// ---- Người tìm việc ----
router.put('/seeker', requireRole('seeker'), asyncHandler(async (req, res) => {
  const { availability, ...fields } = req.body; // availability: ['morning','evening',...]
  if (Array.isArray(availability)) await req.m.seekers.setAvailability(req.user.id, availability);
  ok(res, await req.m.seekers.update(req.user.id, fields));
}));

router.get('/saved', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.saved.list(req.user.id))));
router.put('/saved/:positionId', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.saved.save(req.user.id, req.params.positionId))));
router.delete('/saved/:positionId', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.saved.unsave(req.user.id, req.params.positionId))));

// ---- Nhà tuyển dụng ----
router.put('/shop', requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.shops.updateMine(req.user.id, req.body))));

router.get('/shop/positions', requireRole('employer'), asyncHandler(async (req, res) => {
  const shop = await req.m.shops.getMine(req.user.id);
  ok(res, await req.m.positions.listByShop(shop.id));
}));

router.post('/shop/photos', requireRole('employer'), validate('url'), asyncHandler(async (req, res) => {
  const shop = await req.m.shops.getMine(req.user.id);
  ok(res, await req.m.shops.addPhoto(shop.id, req.body), 201);
}));

router.delete('/shop/photos/:id', requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.shops.removePhoto(req.params.id))));

module.exports = router;
