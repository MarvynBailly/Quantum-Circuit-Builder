# Verification pipeline — setup

The builder stays on **GitHub Pages** (`marvyn.com/Quantum-Circuit-Builder/`).
A separate **Cloudflare Pages** project hosts the backend (submit/review/jobs
API + the D1 queue + the Access-gated review page) at a `*.pages.dev` URL.
The builder calls the backend cross-origin (`/api/submit` has CORS). No
Porkbun / nameserver changes are needed.

```
GitHub Pages (builder) ──POST qcb-6qe.pages.dev/api/submit (code)──▶ D1 (pending)
you ──qcb-6qe.pages.dev/.../review.html (Access)──▶ /api/admin/* ──▶ D1 (approved)
desktop worker ──qcb-6qe.pages.dev/api/jobs (Bearer)──▶ compute ─ email ─ /api/jobs/:id ──▶ D1 (done)
```

Secrets never reach the browser. Spam is blocked by invite codes + the manual
approval gate.

> This guide names the Cloudflare project **`qcb`** → `https://qcb-6qe.pages.dev`.
> `.github/workflows/deploy.yml` already sets `VITE_API_BASE` to that URL. If
> you use a different project name, change it in both places.

## 1. Cloudflare account + Pages project

1. Create a free account at cloudflare.com (don't add your domain).
2. Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick
   `Quantum-Circuit-Builder`. Build command `npm run build`, output `dist`,
   framework preset **None**. Name the project **`qcb`**.
3. Deploy. You get `https://qcb-6qe.pages.dev`. (Its `/api/*` will 500 until the
   database + token below exist — that's expected.)

The Cloudflare build serves the functions, the D1-backed API, and the review
page; it leaves `VITE_API_BASE` empty so the review page talks to its own
origin.

## 2. D1 database

```bash
npm i -g wrangler && wrangler login
wrangler d1 create qcb
# paste the printed database_id into wrangler.toml ([[d1_databases]].database_id)
wrangler d1 migrations apply qcb --remote
```

Bind it: project → **Settings → Functions → D1 database bindings** → add `DB`
→ `qcb`. Then redeploy (Deployments → ⋯ → Retry).

## 3. Secrets / vars (Cloudflare project → Settings → Environment variables, Production)

- `WORKER_TOKEN` — a random secret (`openssl rand -hex 24`). The desktop worker
  uses the same value.
- `ALLOWED_ORIGIN` *(optional)* — `https://marvyn.com` to lock the submit CORS
  to your site (defaults to `*`).
- `CF_ACCESS_AUD` *(optional)* — to make the admin functions also require the
  Access assertion header (defense-in-depth).

## 4. Cloudflare Access (restrict the reviewer side to you)

Dashboard → **Zero Trust → Access → Applications → Add a self-hosted
application**, allow only your email, on these paths (on the `qcb-6qe.pages.dev`
host):

- `qcb-6qe.pages.dev/Quantum-Circuit-Builder/review.html` — the reviewer dashboard
- `qcb-6qe.pages.dev/api/admin/*` — the admin API (the real boundary)

Leave `/api/submit` and `/api/jobs/*` unprotected (code-gated and token-gated
respectively).

## 5. Resend (outbound email — desktop only)

Resend account → verify a sending domain → create an API key. These go in the
**desktop** worker `.env` (`RESEND_API_KEY`, `MAIL_FROM`), never in Cloudflare.

## 6. Invite codes

```bash
node scripts/gen-codes.mjs 10 "first batch" > codes.sql
wrangler d1 execute qcb --remote --file=codes.sql
```

Codes print to your terminal — hand them out. Disable one with
`UPDATE codes SET active = 0 WHERE code = '...';`.

## 7. Point the live builder at the backend

`deploy.yml` already builds with `VITE_API_BASE=https://qcb-6qe.pages.dev`. Push to
`main` → the GitHub Pages Action redeploys the builder so its **Submit for
verification** button posts to your Cloudflare API.

## 8. Desktop worker

See `worker/README.md`. Set `.env`:
`API_BASE=https://qcb-6qe.pages.dev`, `WORKER_TOKEN` (same as step 3),
`RESEND_API_KEY`, `MAIL_FROM`. Then `python worker.py`.

## Local testing (no Cloudflare account needed)

```bash
npm run build
wrangler d1 migrations apply qcb --local
node scripts/gen-codes.mjs 1 local > codes.sql
wrangler d1 execute qcb --local --file=codes.sql
wrangler pages dev dist --binding WORKER_TOKEN=localsecret   # serves site + functions
```

Submit from the local site (same-origin, so no CORS needed locally), inspect
with `wrangler d1 execute qcb --local --command "SELECT id,status FROM submissions"`,
open `/Quantum-Circuit-Builder/review.html` (Access bypassed locally) → Approve,
then run `python worker/worker.py --once` with `API_BASE` set to the pages-dev
URL.
