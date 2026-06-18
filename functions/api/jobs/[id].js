// POST /api/jobs/:id — desktop worker only (Bearer WORKER_TOKEN).
// Records the outcome of a computed job. Body is one of:
//   { result: {...} }   -> status 'done', stores result_json
//   { error: "..." }    -> status 'error', stores error
// Only acts on submissions still in 'approved' (so results can't be
// overwritten and rejected jobs can't be hijacked).

import { json, requireWorker, readJson } from '../../_lib.js';

export async function onRequestPost({ request, env, params }) {
  const denied = requireWorker(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: 'database not configured' }, 500);

  const id = params.id;
  if (!id) return json({ error: 'missing id' }, 400);

  const { data, error } = await readJson(request);
  if (error) return json({ error }, error === 'payload too large' ? 413 : 400);

  const now = new Date().toISOString();
  let res;
  if (data && data.error) {
    res = await env.DB.prepare(
      "UPDATE submissions SET status = 'error', error = ?, completed_at = ? WHERE id = ? AND status = 'approved'",
    )
      .bind(String(data.error).slice(0, 4000), now, id)
      .run();
  } else if (data && data.result) {
    res = await env.DB.prepare(
      "UPDATE submissions SET status = 'done', result_json = ?, completed_at = ? WHERE id = ? AND status = 'approved'",
    )
      .bind(JSON.stringify(data.result), now, id)
      .run();
  } else {
    return json({ error: 'body must contain result or error' }, 400);
  }

  if (!res.meta || res.meta.changes === 0) {
    return json({ error: 'job not found or not in approved state' }, 409);
  }
  return json({ id, ok: true });
}
