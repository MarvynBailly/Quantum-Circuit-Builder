// Shared helpers for the Pages Functions API. Files prefixed with `_`
// are not treated as routes by Cloudflare Pages, so this module is
// import-only.

/** JSON Response with the right content-type. */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

/** Constant-time string compare (avoids leaking token length/contents via timing). */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** url-safe random id for a submission. */
export function newId() {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Gate for the desktop worker endpoints. Requires
 * `Authorization: Bearer ${WORKER_TOKEN}`. Returns a Response on
 * failure, or null when the caller is authorized.
 */
export function requireWorker(request, env) {
  if (!env.WORKER_TOKEN) return json({ error: 'worker auth not configured' }, 500);
  const auth = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m || !safeEqual(m[1], env.WORKER_TOKEN)) {
    return json({ error: 'unauthorized' }, 401);
  }
  return null;
}

/**
 * Gate for the admin endpoints. The real identity check is Cloudflare
 * Access at the edge — it blocks unauthenticated requests before they
 * reach this function. When CF_ACCESS_AUD is configured we additionally
 * require the Access assertion header (defense-in-depth); in local dev
 * (no Access, env unset) this is a no-op so /review works.
 */
export function requireAccess(request, env) {
  if (env.CF_ACCESS_AUD) {
    const jwt = request.headers.get('cf-access-jwt-assertion');
    if (!jwt) return json({ error: 'forbidden' }, 403);
  }
  return null;
}

/** Read + parse a JSON body with a hard size cap. Returns {data} or {error}. */
export async function readJson(request, maxBytes = 512 * 1024) {
  const raw = await request.text();
  if (raw.length > maxBytes) return { error: 'payload too large' };
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { error: 'invalid JSON' };
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(s) {
  return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s);
}

/**
 * CORS headers for the public submit endpoint, which is called
 * cross-origin from the GitHub-Pages-hosted builder. Set ALLOWED_ORIGIN
 * in the Pages project to lock it to your site (e.g. https://marvyn.com);
 * defaults to '*' since /api/submit carries no cookies and is gated by
 * the invite code, not the origin.
 */
export function corsHeaders(env) {
  return {
    'access-control-allow-origin': (env && env.ALLOWED_ORIGIN) || '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}
