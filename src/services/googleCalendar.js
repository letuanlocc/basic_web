const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');
// googleapis rất nặng (~2,5 giây để nạp): chỉ nạp khi thật sự gọi Google, để các API khác không phải trả giá lúc khởi động nguội.
let googleApis;
const google = () => googleApis || (googleApis = require('googleapis').google);
const { admin } = require('../config/supabase');
const { httpError, unwrap } = require('../utils/db');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const CALLBACK_PATH = '/api/google/callback';
const STATE_COOKIE = 'cr_google_oauth';
const STATE_TTL = 10 * 60 * 1000;
const REQUEST_TIMEOUT = 10000;

function readRedirect() {
  try {
    const url = new URL(GOOGLE_REDIRECT_URI);
    if (url.pathname !== CALLBACK_PATH || url.username || url.password || url.search || url.hash) return null;
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return url;
  } catch {
    return null;
  }
  return null;
}

const redirect = readRedirect();
const available = Boolean(admin && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && redirect);
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: redirect?.protocol === 'https:', path: CALLBACK_PATH };

function requireConfig() {
  if (!available) throw httpError(503, 'Google Calendar chưa được cấu hình trên máy chủ.');
}

function oauthClient() {
  return new (google().auth.OAuth2)(
    { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_REDIRECT_URI,
      transporterOptions: { timeout: REQUEST_TIMEOUT } }
  );
}

function sign(payload) {
  return createHmac('sha256', GOOGLE_CLIENT_SECRET).update('caranh-calendar-state:').update(payload).digest('base64url');
}

async function startConnection(userId, req, res) {
  requireConfig();
  if (redirect.host !== (req.get('host') || '').toLowerCase() || redirect.protocol !== req.protocol + ':') {
    throw httpError(400, 'Hãy mở CaRảnh tại ' + redirect.origin + ' để kết nối Google Calendar.');
  }
  const oauth = oauthClient();
  const { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
  const state = randomBytes(32).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, state, codeVerifier, expires: Date.now() + STATE_TTL })).toString('base64url');
  res.cookie(STATE_COOKIE, payload + '.' + sign(payload), { ...cookieOptions, maxAge: STATE_TTL });
  return oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
}

function consumeState(req, res) {
  clearState(res);
  if (!available || typeof req.query.state !== 'string') return null;
  const raw = (req.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(STATE_COOKIE + '='));
  if (!raw) return null;
  const parts = raw.slice(STATE_COOKIE.length + 1).split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const saved = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (saved.state === req.query.state && saved.expires > Date.now()) return saved;
  } catch {
    return null;
  }
  return null;
}

function clearState(res) {
  res.clearCookie(STATE_COOKIE, cookieOptions);
}

async function exchangeCode(code, codeVerifier) {
  const { tokens } = await oauthClient().getToken({ code, codeVerifier });
  if (!tokens.refresh_token || (tokens.scope && !tokens.scope.split(' ').includes(SCOPE))) {
    throw new Error('missing_calendar_permission');
  }
  return tokens.refresh_token;
}

function calendarClient(refreshToken) {
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const { events } = google().calendar({ version: 'v3', auth, timeout: REQUEST_TIMEOUT, retry: false });
  return { events, verifyAccess: () => auth.getAccessToken() };
}

async function getConnection(userId) {
  return unwrap(await admin.from('google_connections')
    .select('refresh_token, status, auto_sync_manager_changes, last_error')
    .eq('user_id', userId).maybeSingle());
}

async function saveConnection(userId, refreshToken) {
  const now = new Date().toISOString();
  unwrap(await admin.from('google_connections').upsert({
    user_id: userId,
    refresh_token: refreshToken,
    status: 'active',
    last_error: null,
    connected_at: now,
    updated_at: now,
  }, { onConflict: 'user_id', defaultToNull: false }));
}

async function updateConnection(userId, patch) {
  return unwrap(await admin.from('google_connections')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId).select('status').maybeSingle());
}

async function disconnect(userId) {
  // Các event giữ nguyên trên Google; xóa token của kết nối tại CaRảnh.
  unwrap(await admin.from('google_connections').delete().eq('user_id', userId));
}

module.exports = {
  available, requireConfig, startConnection, consumeState, clearState, exchangeCode,
  calendarClient, getConnection, saveConnection, updateConnection, disconnect,
};
