import React, { useEffect, useMemo, useState } from 'react';
import { ELEMENT_TYPES } from '../circuit/index.js';
import { buildExportPayload } from '../circuit/exportJSON.js';
import { apiUrl } from '../api.js';
import InlineLatex from './InlineLatex.jsx';

/**
 * "Submit for verification" dialog.
 *
 * The circuit model is purely symbolic (component `value` is a LaTeX
 * name, not a magnitude) and stays that way through submission — no
 * numeric magnitudes are ever collected. The form gathers only the
 * submitter email and an invite code (the server-side anti-spam gate);
 * on submit it serializes the topology with buildExportPayload() — which
 * carries the symbolic capacitance, inductive, and Josephson matrices —
 * and POSTs it to /api/submit.
 */
export default function SubmitModal({ open, onClose, nodes, edges, extra }) {
  // Components that carry a magnitude (C / L / JJ edges of the analysis graph).
  const components = useMemo(
    () => (edges || []).filter((e) => ELEMENT_TYPES[e.type]),
    [edges],
  );

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resultId, setResultId] = useState(null);

  // Reset whenever the dialog is (re)opened. The model stays purely
  // symbolic — no numeric magnitudes are collected here.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setResultId(null);
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!code.trim()) {
      setError('An invite code is required.');
      return;
    }
    if (components.length === 0) {
      setError('Add at least one component (capacitor / inductor / junction) first.');
      return;
    }

    // The exported payload already carries the symbolic capacitance,
    // inductive, and Josephson matrices — that's all we submit.
    const circuit = buildExportPayload(nodes, edges, extra);

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/submit'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), email: email.trim(), circuit }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Submission failed (${res.status}).`);
      } else {
        setResultId(body.id);
      }
    } catch (e) {
      setError(`Could not reach the server: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={card} onMouseDown={(e) => e.stopPropagation()}>
        <div style={header}>SUBMIT FOR VERIFICATION</div>

        {resultId ? (
          <div>
            <p style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>
              Thanks — your symbolic circuit was submitted for review. Updates will
              be emailed to <strong>{email}</strong>.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Reference: <code>{resultId}</code>
            </p>
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button style={primaryBtn} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, marginTop: 0 }}>
              Your circuit&rsquo;s symbolic capacitance, inductive, and Josephson
              matrices are sent for manual review. The model stays fully symbolic —
              no numeric values are collected.
            </p>

            <label style={fieldLabel}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={input}
              />
            </label>

            <label style={fieldLabel}>
              Invite code
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="code you were given"
                style={input}
              />
            </label>

            <div style={{ ...fieldLabel, marginBottom: 4 }}>Components (symbolic)</div>
            {components.length === 0 ? (
              <div style={{ color: 'var(--accent-amber)', fontSize: 12, marginBottom: 8 }}>
                No components yet — add a capacitor, inductor, or junction first.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  maxHeight: 120,
                  overflowY: 'auto',
                  marginBottom: 12,
                }}
              >
                {components.map((c) => (
                  <span
                    key={c.id}
                    style={{
                      padding: '2px 8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <InlineLatex text={String(c.value)} />
                  </span>
                ))}
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--accent-red)', fontSize: 12, marginBottom: 10 }}>{error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={ghostBtn} onClick={onClose} disabled={submitting}>Cancel</button>
              <button style={primaryBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const card = {
  width: 'min(460px, 92vw)',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 20,
  fontSize: 13,
};

const header = {
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: 1,
  color: 'var(--accent-amber)',
  marginBottom: 12,
};

const fieldLabel = {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: 11,
  marginBottom: 12,
};

const input = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '6px 8px',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: 13,
  marginTop: 4,
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
  padding: '6px 14px',
  background: 'var(--accent-amber)',
  border: 'none',
  borderRadius: 6,
  color: '#000',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
