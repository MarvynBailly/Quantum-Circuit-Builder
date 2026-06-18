// POST /api/admin/decision — Cloudflare Access gated.
// Body: { id, decision: 'approved' | 'rejected' }
// Only acts on submissions still in 'pending'.

import { json, requireAccess, readJson } from '../../_lib.js';

export async function onRequestPost({ request, env }) {
  const denied = requireAccess(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: 'database not configured' }, 500);

  const { data, error } = await readJson(request, 4096);
  if (error) return json({ error }, 400);

  const { id, decision } = data || {};
  if (typeof id !== 'string' || !id) return json({ error: 'missing id' }, 400);
  if (decision !== 'approved' && decision !== 'rejected') {
    return json({ error: 'decision must be approved or rejected' }, 400);
  }

  const res = await env.DB.prepare(
    "UPDATE submissions SET status = ?, decided_at = ? WHERE id = ? AND status = 'pending'",
  )
    .bind(decision, new Date().toISOString(), id)
    .run();

  if (!res.meta || res.meta.changes === 0) {
    return json({ error: 'submission not found or already decided' }, 409);
  }
  return json({ id, status: decision });
}
