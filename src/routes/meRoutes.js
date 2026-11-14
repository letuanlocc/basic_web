const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { httpError, pick } = require('../utils/db');
const { checkImage } = require('../utils/image');

const MAX_PHOTO = 1024 * 1024; // 1 MB / ảnh nơi làm việc
const MAX_AVATAR = 300 * 1024; // 300 KB / ảnh thẻ
const MAX_PHOTOS = 8;

// Hồ sơ cửa hàng phải đủ các mục này mới được lưu
const SHOP_REQUIRED = [
  ['name', 'tên công ty / cửa hàng'], ['mode', 'hình thức làm việc'], ['industry', 'lĩnh vực'],
  ['city', 'tỉnh / thành phố'], ['ward', 'phường / xã'], ['address', 'địa chỉ cụ thể'], ['phone', 'SĐT cửa hàng'],
];

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
  if (fields.avatar_url) {
    const bad = checkImage(fields.avatar_url, MAX_AVATAR);
    if (bad) throw httpError(400, 'Ảnh thẻ: ' + bad);
  }
  if (Array.isArray(availability)) await req.m.seekers.setAvailability(req.user.id, availability);
  ok(res, await req.m.seekers.update(req.user.id, fields));
}));

router.get('/saved', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.saved.list(req.user.id))));
router.put('/saved/:positionId', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.saved.save(req.user.id, req.params.positionId))));
router.delete('/saved/:positionId', requireRole('seeker'), asyncHandler(async (req, res) => ok(res, await req.m.saved.unsave(req.user.id, req.params.positionId))));

// ---- Nhà tuyển dụng ----
router.put('/shop', requireRole('employer'), asyncHandler(async (req, res) => {
  const shop = await req.m.shops.getMine(req.user.id);
  const body = { ...req.body };
  if (typeof body.phone === 'string') body.phone = body.phone.replace(/[\s.]/g, '');
  const merged = { ...shop, ...pick(body, ['name', 'mode', 'industry', 'address', 'ward', 'city', 'phone']) };
  const miss = SHOP_REQUIRED.find(([k]) => !merged[k] || !String(merged[k]).trim());
  if (miss) throw httpError(400, 'Vui lòng nhập ' + miss[1]);
  if (!['online', 'offline', 'both'].includes(merged.mode)) throw httpError(400, 'Hình thức làm việc không hợp lệ');
  if (!/^0\d{9}$/.test(merged.phone)) throw httpError(400, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0');
  if (merged.mode !== 'online' && !(shop.photos || []).length) throw httpError(400, 'Cửa hàng làm việc trực tiếp cần ít nhất 1 ảnh nơi làm việc');
  ok(res, await req.m.shops.updateMine(req.user.id, body));
}));

router.get('/shop/positions', requireRole('employer'), asyncHandler(async (req, res) => {
  const shop = await req.m.shops.getMine(req.user.id);
  ok(res, await req.m.positions.listByShop(shop.id));
}));

// body: { url: 'data:image/jpeg;base64,...' } – ảnh tải từ máy, không nhận link http(s)
router.post('/shop/photos', requireRole('employer'), validate('url'), asyncHandler(async (req, res) => {
  const bad = checkImage(req.body.url, MAX_PHOTO);
  if (bad) throw httpError(400, bad);
  const shop = await req.m.shops.getMine(req.user.id);
  if ((shop.photos || []).length >= MAX_PHOTOS) throw httpError(400, `Tối đa ${MAX_PHOTOS} ảnh nơi làm việc`);
  ok(res, await req.m.shops.addPhoto(shop.id, req.body), 201);
}));

router.delete('/shop/photos/:id', requireRole('employer'), asyncHandler(async (req, res) => ok(res, await req.m.shops.removePhoto(req.params.id))));

module.exports = router;
