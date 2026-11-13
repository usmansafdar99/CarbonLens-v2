"""Check the email (Brevo) setup and show the exact reason if sending fails.
Run from the backend folder:  python test_email.py"""
import requests
import config

print("Sender (BREVO_FROM_EMAIL):", config.BREVO_FROM_EMAIL or "(empty)")
print("API key set:", "yes" if config.BREVO_API_KEY else "NO - add BREVO_API_KEY to backend/.env")
if not config.BREVO_API_KEY:
    raise SystemExit
to = input(f"Send a test email to [{config.SUPPORT_EMAIL}]: ").strip() or config.SUPPORT_EMAIL
r = requests.post("https://api.brevo.com/v3/smtp/email", timeout=15,
                  headers={"api-key": config.BREVO_API_KEY, "content-type": "application/json", "accept": "application/json"},
                  json={"sender": {"name": config.BREVO_FROM_NAME, "email": config.BREVO_FROM_EMAIL},
                        "to": [{"email": to}], "subject": "CarbonLens email test",
                        "htmlContent": "<p>If you can read this, CarbonLens email is working.</p>"})
print("Brevo answered:", r.status_code, r.text[:400])
if r.status_code in (200, 201, 202):
    print("OK: email accepted. Check the inbox and the Spam folder.")
elif r.status_code == 401:
    print("PROBLEM: the API key is wrong, expired or was deleted. Create a new key in Brevo > SMTP & API.")
elif "sender" in r.text.lower():
    print("PROBLEM: the sender address is not verified in Brevo. Verify it in Brevo > Senders, Domains & Dedicated IPs,")
    print("or set BREVO_FROM_EMAIL in backend/.env to an address that is already verified there.")
else:
    print("PROBLEM: see Brevo's message above (account not activated, daily limit reached, or IP not authorised).")
