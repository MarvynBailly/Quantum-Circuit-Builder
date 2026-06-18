// POST /api/admin/decision — password gated (ADMIN_TOKEN).
// Body: { id, decision: 'approved' | 'rejected' }
// Only acts on submissions still in 'pending'.

import { json, requireAdmin, readJson, corsHeaders } from '../../_lib.js';

export function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

export async function onRequestPost({ request, env }) {
  const cors = corsHeaders(env);
  const denied = requireAdmin(request, env);
  if (denied) {
    for (const [k, v] of Object.entries(cors)) denied.headers.set(k, v);
    return denied;
  }
  if (!env.DB) return json({ error: 'database not configured' }, 500, cors);

  const { data, error } = await readJson(request, 4096);
  if (error) return json({ error }, 400, cors);

  const { id, decision } = data || {};
  if (typeof id !== 'string' || !id) return json({ error: 'missing id' }, 400, cors);
  if (decision !== 'approved' && decision !== 'rejected') {
    return json({ error: 'decision must be approved or rejected' }, 400, cors);
  }

  const res = await env.DB.prepare(
    "UPDATE submissions SET status = ?, decided_at = ? WHERE id = ? AND status = 'pending'",
  )
    .bind(decision, new Date().toISOString(), id)
    .run();

  if (!res.meta || res.meta.changes === 0) {
    return json({ error: 'submission not found or already decided' }, 409, cors);
  }
  return json({ id, status: decision }, 200, cors);
}
