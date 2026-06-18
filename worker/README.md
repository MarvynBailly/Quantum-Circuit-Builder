# Desktop verification worker

Polls the Cloudflare Pages API for **approved** circuit submissions,
computes a **symbolic** result locally (sympy), records it, and emails the
submitter (Resend). It only makes outbound HTTPS calls — nothing listens
on this machine.

## Setup

```bash
cd worker
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill it in
```

`.env` values:

| var              | meaning                                                        |
|------------------|----------------------------------------------------------------|
| `API_BASE`       | Cloudflare backend base, e.g. `https://qcb-6qe.pages.dev`        |
| `WORKER_TOKEN`   | must equal the `WORKER_TOKEN` secret set in Cloudflare Pages    |
| `RESEND_API_KEY` | Resend API key (stays on this machine)                          |
| `MAIL_FROM`      | a verified Resend sender, e.g. `QCB <verify@yourdomain>`        |
| `POLL_INTERVAL`  | seconds between polls when idle (default 15)                    |

## Run

```bash
python worker.py          # loop forever (normal operation)
python worker.py --once   # drain the current approved queue, then exit
python symbolic.py        # self-test the symbolic math on a demo circuit
```

## What it computes (symbolic)

Rebuilds three symbolic matrices from the submitted topology, on the live
(non-grounded) node basis, and returns their matrix product **C · L · J**:

- **C** — capacitance graph-Laplacian (symbols are the capacitor labels).
- **L** — inductive graph-Laplacian (inductor labels).
- **J** — Josephson adjacency matrix (junction labels).

Entries stay fully symbolic via `sympy`; the result is returned as LaTeX
(`product_latex`) plus a cell grid (`product_cells`). Putting all three on
the live-node basis makes them conformable (junction-to-ground terms drop
out). No numeric values are involved.

## Keep it running

- **Windows**: Task Scheduler -> Create Task -> trigger "At log on",
  action `python C:\path\to\worker\worker.py`, "Run whether user is
  logged on or not".
- **Linux**: a small systemd service or a `cron @reboot` entry running
  `worker.py`.
