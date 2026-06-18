-- Quantum Circuit Builder — verification queue schema (Cloudflare D1 / SQLite)
--
-- Apply with:
--   wrangler d1 migrations apply qcb              (remote)
--   wrangler d1 migrations apply qcb --local      (local dev)

-- Circuits submitted for verification. One row per submission; the
-- whole lifecycle (pending -> approved/rejected -> done/error) lives here.
CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT PRIMARY KEY,          -- random url-safe id
  created_at    TEXT NOT NULL,             -- ISO-8601 timestamp
  email         TEXT NOT NULL,             -- submitter, emailed the results
  code          TEXT NOT NULL,             -- invite code used (audit trail)
  circuit_json  TEXT NOT NULL,             -- buildExportPayload() topology
  values_json   TEXT NOT NULL,             -- { edgeId: { magnitude, unit } }
  status        TEXT NOT NULL DEFAULT 'pending',
                                           -- pending | approved | rejected | done | error
  result_json   TEXT,                      -- energies written back by the worker
  error         TEXT,                      -- failure detail if status = 'error'
  decided_at    TEXT,                      -- when Marvyn approved/rejected
  completed_at  TEXT                       -- when the worker finished
);

CREATE INDEX IF NOT EXISTS idx_submissions_status     ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

-- Invite codes. Only a holder of an active code (under its optional
-- use cap) may submit — this is the primary anti-spam gate.
CREATE TABLE IF NOT EXISTS codes (
  code        TEXT PRIMARY KEY,            -- the secret a submitter types in
  label       TEXT,                        -- who it was handed to (your note)
  active      INTEGER NOT NULL DEFAULT 1,  -- 0 disables without deleting
  max_uses    INTEGER,                     -- NULL = unlimited
  used        INTEGER NOT NULL DEFAULT 0,  -- incremented per accepted submission
  created_at  TEXT NOT NULL
);
