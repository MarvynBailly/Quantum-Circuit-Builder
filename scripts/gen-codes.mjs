#!/usr/bin/env node
// Generate invite codes and print the D1 INSERT SQL to stdout.
// The human-readable list of codes is printed to stderr.
//
// Usage:
//   node scripts/gen-codes.mjs [count] [label] [maxUses]
//
//   node scripts/gen-codes.mjs 10 "spring batch" > codes.sql
//   wrangler d1 execute qcb --remote --file=codes.sql
//
// maxUses omitted / 0  => unlimited (NULL).

import { randomBytes } from 'node:crypto';

const count = Math.max(1, parseInt(process.argv[2] || '10', 10));
const label = process.argv[3] || '';
const maxUsesArg = parseInt(process.argv[4] || '0', 10);
const maxUses = Number.isFinite(maxUsesArg) && maxUsesArg > 0 ? maxUsesArg : null;
const now = new Date().toISOString();

const esc = (s) => String(s).replace(/'/g, "''");

const codes = [];
const stmts = [];
for (let i = 0; i < count; i++) {
  const code = randomBytes(8).toString('hex'); // 16 hex chars
  codes.push(code);
  stmts.push(
    `INSERT INTO codes (code, label, active, max_uses, used, created_at) ` +
      `VALUES ('${code}', '${esc(label)}', 1, ${maxUses === null ? 'NULL' : maxUses}, 0, '${now}');`,
  );
}

// SQL -> stdout (pipe/redirect to a file), codes -> stderr (for you to read).
console.error(`Generated ${count} invite code(s)${label ? ` for "${label}"` : ''}` +
  `${maxUses ? `, max ${maxUses} use(s) each` : ''}:`);
for (const c of codes) console.error('  ' + c);
console.error('\nApply with: wrangler d1 execute qcb --remote --file=codes.sql\n');

console.log(stmts.join('\n'));
