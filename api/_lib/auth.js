import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'health_session';

function configuredPassword() {
  const value = process.env.HEALTH_ACCESS_PASSWORD;
  if (!value) throw new Error('HEALTH_ACCESS_PASSWORD environment variable is not configured');
  return value;
}

function signature() {
  const password = configuredPassword();
  const secret = process.env.HEALTH_COOKIE_SECRET || password;
  return createHmac('sha256', secret)
    .update('health-tracker-session-v1')
    .digest('hex');
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map(part => {
        const [key, ...value] = part.trim().split('=');
        return [key, decodeURIComponent(value.join('='))];
      })
      .filter(([key]) => key)
  );
}

export function isAuthorized(req) {
  const session = parseCookies(req)[COOKIE_NAME];
  if (!session) return false;
  try {
    const expected = signature();
    return session.length === expected.length && timingSafeEqual(Buffer.from(session), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function passwordMatches(password) {
  try {
    const expected = configuredPassword();
    const given = String(password || '');
    return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function setSession(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${signature()}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=2592000`
  );
}

export function clearSession(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=0`
  );
}
