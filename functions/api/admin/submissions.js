// GET /api/admin/submissions?status=pending — password gated (ADMIN_TOKEN).
// Lists submissions (newest first) with parsed circuit + values so the
// review page can render them.

import { json, requireAdmin, corsHeaders } from '../../_lib.js';

const ALLOWED = new Set(['pending', 'approved', 'rejected', 'done', 'error']);

export function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

export async function onRequestGet({ request, env }) {
  const cors = corsHeaders(env);
  const denied = requireAdmin(request, env);
  if (denied) {
    for (const [k, v] of Object.entries(cors)) denied.headers.set(k, v);
    return denied;
  }
  if (!env.DB) return json({ error: 'database not configured' }, 500, cors);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';
  if (!ALLOWED.has(status)) return json({ error: 'invalid status' }, 400, cors);

  const { results } = await env.DB.prepare(
    `SELECT id, created_at, email, code, status, circuit_json, values_json,
            result_json, error, decided_at, completed_at
       FROM submissions
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT 200`,
  )
    .bind(status)
    .all();

  const submissions = (results || []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    email: r.email,
    code: r.code,
    status: r.status,
    circuit: safeParse(r.circuit_json),
    values: safeParse(r.values_json) || {},
    result: safeParse(r.result_json),
    error: r.error,
    decided_at: r.decided_at,
    completed_at: r.completed_at,
  }));

  return json({ submissions }, 200, cors);
}

function safeParse(s) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
