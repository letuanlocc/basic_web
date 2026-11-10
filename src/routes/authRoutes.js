const router = require('express').Router();
const Auth = require('../models/Auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { byIp, cooldown } = require('../middlewares/rateLimit');

const loginLimit = byIp(10 * 60 * 1000, 20); // 20 lần / 10 phút / IP
const mailLimit = byIp(60 * 1000, 5); // 5 yêu cầu gửi mail / phút / IP
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// body: { email, password, full_name, phone (0xxxxxxxxx), role: 'seeker' | 'employer' }
router.post('/register', loginLimit, validate('email', 'password', 'full_name', 'phone'), asyncHandler(async (req, res) => {
  ok(res, await Auth.register(req.body), 201);
}));

// email có thể là email hoặc số điện thoại
router.post('/login', loginLimit, validate('email', 'password'), asyncHandler(async (req, res) => {
  ok(res, await Auth.login(req.body));
}));

router.post('/refresh', validate('refresh_token'), asyncHandler(async (req, res) => {
  ok(res, await Auth.refresh(req.body.refresh_token));
}));

router.post('/forgot-password', mailLimit, validate('email'), asyncHandler(async (req, res) => {
  cooldown('forgot:' + String(req.body.email).toLowerCase(), 60);
  const redirectTo = `${req.protocol}://${req.get('host')}/reset-password.html`;
  ok(res, await Auth.forgotPassword(req.body.email, redirectTo));
}));

router.post('/reset-password', loginLimit, validate('access_token', 'password'), asyncHandler(async (req, res) => {
  ok(res, await Auth.resetPassword(req.body.access_token, req.body.password));
}));

router.post('/resend-confirmation', mailLimit, validate('email'), asyncHandler(async (req, res) => {
  cooldown('resend:' + String(req.body.email).toLowerCase(), 60);
  ok(res, await Auth.resendConfirmation(req.body.email));
}));

router.post('/change-password', loginLimit, requireAuth, validate('current_password', 'new_password'), asyncHandler(async (req, res) => {
  ok(res, await Auth.changePassword(req.user, req.body.current_password, req.body.new_password));
}));

router.post('/change-email', loginLimit, requireAuth, validate('password', 'new_email'), asyncHandler(async (req, res) => {
  ok(res, await Auth.changeEmail(req.user, req.body.password, req.body.new_email));
}));

router.post('/delete-account', loginLimit, requireAuth, validate('password'), asyncHandler(async (req, res) => {
  ok(res, await Auth.deleteAccount(req.user, req.body.password));
}));

module.exports = router;
