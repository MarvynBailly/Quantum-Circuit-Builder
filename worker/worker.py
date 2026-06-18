"""
Desktop verification worker for the Quantum Circuit Builder.

Polls the Cloudflare Pages API for *approved* submissions, computes the
energies locally, records the result back, and emails the submitter.

Security / network posture:
  - Only makes OUTBOUND HTTPS calls (poll, post result, send email);
    nothing listens on this machine.
  - Authenticates to the job API with a bearer token (WORKER_TOKEN) that
    matches the secret set in the Cloudflare Pages project.
  - The Resend API key never leaves this machine.

Run:
  pip install -r requirements.txt
  cp .env.example .env   # then fill it in
  python worker.py            # loop forever
  python worker.py --once     # process the current queue once and exit
"""

import os
import sys
import time
import json

import requests
from dotenv import load_dotenv

from symbolic import compute_symbolic

load_dotenv()

API_BASE = os.environ.get("API_BASE", "").rstrip("/")
WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "15"))

TIMEOUT = 30


def _auth_headers():
    return {"Authorization": f"Bearer {WORKER_TOKEN}"}


def fetch_jobs():
    r = requests.get(f"{API_BASE}/api/jobs", headers=_auth_headers(), timeout=TIMEOUT)
    r.raise_for_status()
    return r.json().get("jobs", [])


def post_result(job_id, *, result=None, error=None):
    body = {"result": result} if error is None else {"error": error}
    r = requests.post(
        f"{API_BASE}/api/jobs/{job_id}",
        headers={**_auth_headers(), "content-type": "application/json"},
        data=json.dumps(body),
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json()


def render_email(result):
    """Plain-text summary of the symbolic result (matrices in LaTeX)."""
    lines = ["Your circuit was reviewed. Symbolic result — the matrix product C · L · J:", ""]
    if result.get("node_order"):
        lines.append("Node order: " + ", ".join(str(x) for x in result["node_order"]))
        lines.append(f"Basis: {result.get('basis', '')}")
        lines.append("")
    lines.append("Product  C · L · J  (LaTeX):")
    lines.append("  " + result.get("product_latex", ""))
    lines.append("")
    lines.append("Input matrices (LaTeX):")
    lines.append("  C = " + result.get("capacitance_latex", ""))
    lines.append("  L = " + result.get("inductive_latex", ""))
    lines.append("  J = " + result.get("josephson_latex", ""))
    lines.append("")
    lines.append("Full machine-readable result (JSON):")
    lines.append("")
    lines.append(json.dumps(result, indent=2))
    return "\n".join(lines)


def send_email(to_addr, result):
    if not (RESEND_API_KEY and MAIL_FROM):
        print("  ! email skipped (RESEND_API_KEY / MAIL_FROM not set)")
        return False
    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "content-type": "application/json",
        },
        data=json.dumps(
            {
                "from": MAIL_FROM,
                "to": [to_addr],
                "subject": "Your quantum circuit verification results",
                "text": render_email(result),
            }
        ),
        timeout=TIMEOUT,
    )
    if r.status_code >= 300:
        print(f"  ! email failed ({r.status_code}): {r.text[:200]}")
        return False
    return True


def process_job(job):
    job_id = job["id"]
    print(f"- job {job_id} for {job.get('email')}")
    try:
        result = compute_symbolic(job["circuit"])
    except Exception as exc:  # noqa: BLE001 — report any compute failure back
        print(f"  ! compute error: {exc}")
        post_result(job_id, error=f"compute error: {exc}")
        return
    # Record the result first (don't lose it if email later fails), then email.
    post_result(job_id, result=result)
    print("  result recorded (status=done)")
    if send_email(job.get("email"), result):
        print("  email sent")


def run_once():
    jobs = fetch_jobs()
    if not jobs:
        return 0
    for job in jobs:
        process_job(job)
    return len(jobs)


def main():
    if not API_BASE or not WORKER_TOKEN:
        print("API_BASE and WORKER_TOKEN must be set (see .env.example).")
        sys.exit(1)

    once = "--once" in sys.argv
    print(f"worker -> {API_BASE} (poll {POLL_INTERVAL}s){' [once]' if once else ''}")
    if once:
        n = run_once()
        print(f"processed {n} job(s)")
        return

    while True:
        try:
            n = run_once()
            if n:
                print(f"processed {n} job(s)")
        except requests.RequestException as exc:
            print(f"poll error: {exc}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
