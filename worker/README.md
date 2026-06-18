# Desktop verification worker

Polls the Cloudflare Pages API for **approved** circuit submissions,
computes the energies locally (numpy), records the result, and emails the
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
| `API_BASE`       | site root serving the functions, e.g. `https://marvyn.com`      |
| `WORKER_TOKEN`   | must equal the `WORKER_TOKEN` secret set in Cloudflare Pages    |
| `RESEND_API_KEY` | Resend API key (stays on this machine)                          |
| `MAIL_FROM`      | a verified Resend sender, e.g. `QCB <verify@yourdomain>`        |
| `POLL_INTERVAL`  | seconds between polls when idle (default 15)                    |

## Run

```bash
python worker.py          # loop forever (normal operation)
python worker.py --once   # drain the current approved queue, then exit
python energies.py        # self-test the energy math on a demo circuit
```

## What it computes (all in GHz)

- **Charging**: capacitance matrix (grounds eliminated) -> `C^-1`;
  charging-energy matrix `2 e^2 C^-1 / h`, and per-node
  `E_C = (e^2/2)(C^-1)_ii / h`.
- **Inductive**: `E_L = phi0^2 / L` per inductor (`phi0 = hbar/2e`).
- **Josephson**: `E_J` passed through (entered in GHz).

Conventions match the JS app (`src/physics/`) and Lin et al.
(arXiv:2512.05851). A circuit with no capacitors reports "no charging
term" rather than failing.

## Keep it running

- **Windows**: Task Scheduler -> Create Task -> trigger "At log on",
  action `python C:\path\to\worker\worker.py`, "Run whether user is
  logged on or not".
- **Linux**: a small systemd service or a `cron @reboot` entry running
  `worker.py`.
