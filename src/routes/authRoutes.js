const router = require('express').Router();
const Auth = require('../models/Auth');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate');

// body: { email, password, full_name, phone (0xxxxxxxxx), role: 'seeker' | 'employer' }
router.post('/register', validate('email', 'password', 'full_name', 'phone'), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await Auth.register(req.body) });
}));

router.post('/login', validate('email', 'password'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Auth.login(req.body) });
}));

router.post('/refresh', validate('refresh_token'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Auth.refresh(req.body.refresh_token) });
}));

module.exports = router;
