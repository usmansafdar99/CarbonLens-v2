"""Transactional email through Brevo's HTTP API (free tier: 300 emails/day)."""
import logging

import requests

import config
from security import e

log = logging.getLogger("carbonlens.mail")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def configured() -> bool:
    return bool(config.BREVO_API_KEY and config.BREVO_FROM_EMAIL)


def send(to_email: str, subject: str, html_body: str, reply_to: dict | None = None) -> bool:
    if not configured():
        log.warning("Email not sent (BREVO_API_KEY / BREVO_FROM_EMAIL not set): %s", subject)
        return False
    payload = {
        "sender": {"name": config.BREVO_FROM_NAME, "email": config.BREVO_FROM_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }
    if reply_to:
        payload["replyTo"] = reply_to
    try:
        r = requests.post(BREVO_URL, json=payload, timeout=10, headers={
            "accept": "application/json", "content-type": "application/json",
            "api-key": config.BREVO_API_KEY})
        if r.status_code in (200, 201, 202):
            return True
        log.error("Brevo rejected email (%s): %s", r.status_code, r.text[:300])
    except requests.RequestException as exc:
        log.error("Brevo request failed: %s", exc)
    return False


def layout(title: str, inner_html: str) -> str:
    """Shared, plain email layout. `inner_html` must already be escaped where needed."""
    return f"""<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;
      border:1px solid #e3e8e2;border-radius:12px;color:#26392f">
  <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#178a4c">CarbonLens by SAWiE</div>
  <h2 style="margin:6px 0 14px;color:#0f5132;font-size:20px">{e(title)}</h2>
  {inner_html}
  <hr style="border:none;border-top:1px solid #eef2ed;margin:20px 0 10px">
  <p style="color:#8a998f;font-size:11.5px;margin:0">SAWiE Ecosystems (Private) Limited &middot; {e(config.SUPPORT_EMAIL)}</p>
</div>"""


def otp_email(name: str, code: str, purpose_text: str, minutes: int) -> str:
    return layout("Your verification code", f"""
  <p style="font-size:14px">Hi <b>{e(name)}</b>, use this code to {e(purpose_text)}:</p>
  <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#0f5132;background:#f2fbf5;
       border:1px solid #c7eed5;border-radius:10px;padding:14px 0;text-align:center;margin:16px 0">{e(code)}</div>
  <p style="font-size:12.5px;color:#56685d">The code expires in {minutes} minutes. If you did not ask for it, ignore this
  email; nothing changes on your account.</p>""")
