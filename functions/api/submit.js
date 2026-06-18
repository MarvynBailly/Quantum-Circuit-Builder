// POST /api/submit — public, invite-code gated.
// Body: { code, email, circuit, values }
//   code    — invite code (anti-spam gate)
//   email   — submitter, emailed the results
//   circuit — buildExportPayload() topology (nodes/edges/...)
//   values  — { [edgeId]: { magnitude:Number, unit:'fF'|'nH'|'GHz' } }

import {
  json,
  readJson,
  newId,
  isEmail,
  corsHeaders,
  sendResendEmail,
  escapeHtml,
} from '../_lib.js';

// Cap how many un-reviewed submissions a single code can have queued at
// once, so a leaked code can't flood the review queue.
const MAX_PENDING_PER_CODE = 20;

const DEFAULT_REVIEW_URL = 'https://marvyn.com/Quantum-Circuit-Builder/review.html';

// Preflight for the cross-origin POST from the builder.
export function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const cors = corsHeaders(env);
  const reply = (data, status) => json(data, status, cors);

  if (!env.DB) return reply({ error: 'database not configured' }, 500);

  const { data, error } = await readJson(request);
  if (error) return reply({ error }, error === 'payload too large' ? 413 : 400);

  const { code, email, circuit, values } = data || {};
  if (typeof code !== 'string' || code.length < 1 || code.length > 128) {
    return reply({ error: 'missing or invalid code' }, 400);
  }
  if (!isEmail(email)) return reply({ error: 'a valid email is required' }, 400);
  if (!circuit || !Array.isArray(circuit.nodes) || !Array.isArray(circuit.edges)) {
    return reply({ error: 'missing circuit topology' }, 400);
  }
  if (values && typeof values !== 'object') {
    return reply({ error: 'invalid values map' }, 400);
  }

  // Validate the invite code.
  const row = await env.DB.prepare(
    'SELECT code, active, max_uses, used FROM codes WHERE code = ?',
  )
    .bind(code)
    .first();
  if (!row || !row.active) return reply({ error: 'invalid or inactive code' }, 403);
  if (row.max_uses != null && row.used >= row.max_uses) {
    return reply({ error: 'this code has reached its submission limit' }, 403);
  }

  // Anti-flood: cap queued (un-reviewed) submissions per code.
  const pending = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM submissions WHERE code = ? AND status = 'pending'",
  )
    .bind(code)
    .first();
  if (pending && pending.n >= MAX_PENDING_PER_CODE) {
    return reply({ error: 'too many pending submissions for this code' }, 429);
  }

  const id = newId();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO submissions (id, created_at, email, code, circuit_json, values_json, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    ).bind(
      id,
      now,
      email,
      code,
      JSON.stringify(circuit),
      JSON.stringify(values || {}),
    ),
    env.DB.prepare('UPDATE codes SET used = used + 1 WHERE code = ?').bind(code),
  ]);

  // Notify the reviewer with a deep-link to this submission's preview.
  // Fired in the background so it never delays or fails the submission;
  // a no-op until Resend (+ NOTIFY_EMAIL) is configured.
  if (env.NOTIFY_EMAIL) {
    const reviewUrl = env.REVIEW_URL || DEFAULT_REVIEW_URL;
    const link = `${reviewUrl}?id=${id}`;
    const safeEmail = escapeHtml(email);
    const send = sendResendEmail(env, {
      to: env.NOTIFY_EMAIL,
      subject: `New circuit submission from ${email}`,
      text: `New circuit submission from ${email}.\n\nReview it: ${link}\n\nSubmission id: ${id}`,
      html:
        `<p>New circuit submission from <strong>${safeEmail}</strong>.</p>` +
        `<p><a href="${link}">Open the submitted preview &rarr;</a></p>` +
        `<p style="color:#888">Submission id: <code>${id}</code></p>`,
    });
    if (context.waitUntil) context.waitUntil(send);
    else await send;
  }

  return reply({ id, status: 'pending' }, 201);
}
