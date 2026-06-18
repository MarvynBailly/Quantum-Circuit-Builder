import React, { useCallback, useEffect, useState } from 'react';
import ReadOnlyCircuit from './ReadOnlyCircuit.jsx';
import InlineLatex from '../components/InlineLatex.jsx';
import { apiUrl } from '../api.js';

const TOKEN_KEY = 'qcb_admin_token';

/**
 * Reviewer dashboard (review.html). Gated by a shared password
 * (ADMIN_TOKEN): the password is entered once, kept in localStorage, and
 * sent as `Authorization: Bearer <token>` on every admin call. Share the
 * password with your team's reviewers.
 */
export default function ReviewApp() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [authError, setAuthError] = useState(null);

  const unlock = useCallback((t) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* ignore */
    }
    setAuthError(null);
    setToken(t);
  }, []);

  const lock = useCallback((msg) => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setAuthError(msg || null);
    setToken('');
  }, []);

  if (!token) return <LoginGate error={authError} onUnlock={unlock} />;
  return (
    <Dashboard
      token={token}
      onUnauthorized={() => lock('Incorrect password — try again.')}
      onLock={() => lock(null)}
    />
  );
}

function LoginGate({ error, onUnlock }) {
  const [value, setValue] = useState('');
  return (
    <div style={page}>
      <div style={{ maxWidth: 360, margin: '12vh auto 0', padding: 24 }}>
        <div style={{ ...title, marginBottom: 16 }}>QCB — REVIEWER SIGN IN</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onUnlock(value.trim());
          }}
        >
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Admin password
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              style={input}
            />
          </label>
          {error && <div style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button type="submit" style={{ ...primaryBtn, width: '100%', marginTop: 14 }}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ token, onUnauthorized, onLock }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const authHeaders = useCallback(
    (extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra }),
    [token],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/submissions?status=pending'), {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
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
  }, [authHeaders, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = useCallback(
    async (id, decision) => {
      setBusyId(id);
      try {
        const res = await fetch(apiUrl('/api/admin/decision'), {
          method: 'POST',
          headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ id, decision }),
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
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
    },
    [authHeaders, onUnauthorized],
  );

  return (
    <div style={page}>
      <header style={headerBar}>
        <div style={title}>QCB — SUBMISSIONS TO REVIEW</div>
        <button style={ghostBtn} onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <button style={ghostBtn} onClick={onLock} title="Forget the password on this device">
          Lock
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
          {Object.keys(values || {}).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Symbolic submission — no numeric values.
            </div>
          ) : (
            <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {Object.entries(values).map(([edgeId, v]) => {
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
          )}

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
  gap: 12,
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
const input = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '8px 10px',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: 14,
  marginTop: 6,
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
const primaryBtn = {
  padding: '8px 14px',
  background: 'var(--accent-amber)',
  border: 'none',
  borderRadius: 6,
  color: '#000',
  fontWeight: 600,
  fontSize: 13,
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
