import React, { useCallback, useEffect, useState } from 'react';
import ReadOnlyCircuit from './ReadOnlyCircuit.jsx';
import InlineLatex from '../components/InlineLatex.jsx';
import { apiUrl } from '../api.js';

/**
 * Reviewer dashboard (served at review.html, gated by Cloudflare Access).
 * Lists pending submissions, renders each circuit + its numeric values,
 * and lets the reviewer Approve (queues it for the desktop worker) or
 * Reject.
 */
export default function ReviewApp() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/submissions?status=pending'));
      if (res.status === 403) {
        setError('Not authorized. This page is restricted to the site owner.');
        setSubmissions([]);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Failed to load (${res.status}).`);
        return;
      }
      setSubmissions(body.submissions || []);
    } catch (e) {
      setError(`Could not reach the server: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = useCallback(async (id, decision) => {
    setBusyId(id);
    try {
      const res = await fetch(apiUrl('/api/admin/decision'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error || `Failed to ${decision} (${res.status}).`);
        return;
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      alert(`Could not reach the server: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div style={page}>
      <header style={headerBar}>
        <div style={title}>QCB — SUBMISSIONS TO REVIEW</div>
        <button style={ghostBtn} onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div style={{ padding: 24 }}>
        {error && <div style={errBox}>{error}</div>}
        {!error && !loading && submissions.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No pending submissions.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {submissions.map((s) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              busy={busyId === s.id}
              onApprove={() => decide(s.id, 'approved')}
              onReject={() => decide(s.id, 'rejected')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubmissionCard({ submission, busy, onApprove, onReject }) {
  const { circuit, values } = submission;
  // Map analysis-edge id -> symbol/type so we can label the magnitudes.
  const edgeById = new Map((circuit?.edges || []).map((e) => [e.id, e]));

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <ReadOnlyCircuit circuit={circuit} />

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <strong>{submission.email}</strong>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            {new Date(submission.created_at).toLocaleString()} · code <code>{submission.code}</code>
            <br />
            id <code>{submission.id}</code>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            COMPONENT VALUES
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {Object.entries(values || {}).map(([edgeId, v]) => {
                const e = edgeById.get(edgeId);
                return (
                  <tr key={edgeId}>
                    <td style={{ padding: '2px 10px 2px 0' }}>
                      {e ? <InlineLatex text={String(e.value)} /> : edgeId}
                    </td>
                    <td style={{ padding: '2px 0', color: 'var(--text-primary)' }}>
                      {v.magnitude} {v.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button style={approveBtn} onClick={onApprove} disabled={busy}>
              {busy ? '…' : 'Approve'}
            </button>
            <button style={rejectBtn} onClick={onReject} disabled={busy}>
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const page = { minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' };
const headerBar = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '14px 24px',
  borderBottom: '1px solid var(--border)',
};
const title = { fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--accent-amber)', flex: 1 };
const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 16,
};
const ghostBtn = {
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const approveBtn = {
  padding: '6px 16px',
  background: 'var(--accent-green, #34d399)',
  border: 'none',
  borderRadius: 6,
  color: '#000',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const rejectBtn = {
  padding: '6px 16px',
  background: 'transparent',
  border: '1px solid var(--accent-red)',
  borderRadius: 6,
  color: 'var(--accent-red)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const errBox = {
  background: 'rgba(248,113,113,0.1)',
  border: '1px solid var(--accent-red)',
  color: 'var(--accent-red)',
  borderRadius: 6,
  padding: 12,
  fontSize: 13,
  marginBottom: 16,
};
