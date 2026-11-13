"""Contact form: saved to the database and emailed to the SAWiE inbox."""
import logging

from flask import Blueprint, jsonify

import config
import mailer
from database import session_scope
from models import ContactMessage
from security import clean_str, e, json_body, rate_limit, valid_email

contact_bp = Blueprint("contact", __name__)
log = logging.getLogger("carbonlens.contact")


@contact_bp.post("/send")
@rate_limit(5, 600, "contact")
def send_contact():
    data = json_body()
    category = data.get("category")
    name = clean_str(data.get("name"), 120)
    email = clean_str(data.get("email"), 254).lower()
    farm_id = clean_str(data.get("farm_id"), 100)
    message = clean_str(data.get("message"), 5000)

    if category not in ("info", "tech"):
        return jsonify({"detail": "Please choose a topic."}), 400
    if not name:
        return jsonify({"detail": "Please enter your name."}), 400
    if not valid_email(email):
        return jsonify({"detail": "Please enter a valid email address."}), 400
    if len(message) < 5:
        return jsonify({"detail": "Please write a short message."}), 400

    label = "General information" if category == "info" else "Technical support"
    subject = f"CarbonLens: {label}" + (f" (farm {farm_id})" if farm_id else "")
    body = mailer.layout("New message from the CarbonLens contact form", f"""
  <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:12px">
    <tr><td style="color:#8a998f;padding:4px 0;width:110px">From</td><td><b>{e(name)}</b> &lt;{e(email)}&gt;</td></tr>
    <tr><td style="color:#8a998f;padding:4px 0">Topic</td><td>{e(label)}</td></tr>
    <tr><td style="color:#8a998f;padding:4px 0">Farm ID</td><td>{e(farm_id) or '&ndash;'}</td></tr>
  </table>
  <div style="font-size:14px;white-space:pre-wrap;background:#f7f9f6;border-radius:8px;padding:12px">{e(message)}</div>""")

    to_addr = config.CONTACT_EMAIL_INFO if category == "info" else config.CONTACT_EMAIL_TECH
    sent = mailer.send(to_addr, subject, body, reply_to={"email": email, "name": name})

    try:
        with session_scope() as db:
            db.add(ContactMessage(category=category, name=name, email=email,
                                  farm_id=farm_id or None, message=message, email_sent=sent))
    except Exception:
        log.exception("Could not save contact message")
        if not sent:
            return jsonify({"detail": "Your message could not be sent. Please email sawie.info@gmail.com directly."}), 500

    return jsonify({"message": "Thank you. Your message has reached the SAWiE team and we will reply by email."})
