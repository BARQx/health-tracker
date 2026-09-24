import { isAuthorized, passwordMatches, setSession, clearSession } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ authenticated: isAuthorized(req) });
  }

  if (req.method === 'POST') {
    const { action, password } = req.body || {};

    if (action === 'logout') {
      clearSession(res);
      return res.status(200).json({ ok: true });
    }

    if (!password || !passwordMatches(password)) {
      return res.status(401).json({ error: 'Incorrect access password' });
    }

    setSession(res);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
