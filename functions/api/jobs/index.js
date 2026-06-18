// GET /api/jobs — desktop worker only (Bearer WORKER_TOKEN).
// Returns approved jobs awaiting computation, oldest decision first.

import { json, requireWorker } from '../../_lib.js';

export async function onRequestGet({ request, env }) {
  const denied = requireWorker(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: 'database not configured' }, 500);

  const { results } = await env.DB.prepare(
    `SELECT id, email, circuit_json, values_json
       FROM submissions
      WHERE status = 'approved'
      ORDER BY decided_at ASC
      LIMIT 10`,
  ).all();

  const jobs = (results || []).map((r) => ({
    id: r.id,
    email: r.email,
    circuit: JSON.parse(r.circuit_json),
    values: r.values_json ? JSON.parse(r.values_json) : {},
  }));

  return json({ jobs });
}
