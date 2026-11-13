"""API tests. Run from the backend folder:  python -m pytest -q   (or: python tests/test_api.py)"""
import os
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-1234567890"
os.environ["BREVO_API_KEY"] = "test"
os.environ["APP_ENV"] = "development"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mailer  # noqa: E402

SENT = []
mailer.send = lambda to, subject, body, reply_to=None: SENT.append((to, subject, body)) or True

import app as app_module  # noqa: E402
from database import SessionLocal  # noqa: E402
from models import RefreshToken, User  # noqa: E402
import security  # noqa: E402

H = {"X-CL-Request": "1"}


def client():
    security._hits.clear()            # independent rate-limit windows per test
    return app_module.app.test_client()


def register(c, name="alice", pw="Cotton2026", remember=False):
    return c.post("/api/auth/register", headers=H, json={
        "username": name, "email": f"{name}@example.com", "password": pw,
        "full_name": name.title(), "remember": remember})


def code_from_last_email():
    import re
    return re.search(r">(\d{6})<", SENT[-1][2]).group(1)


def test_csrf_header_required():
    c = client()
    r = c.post("/api/auth/login", json={"username": "x", "password": "y"})
    assert r.status_code == 403


def test_register_login_me_logout():
    c = client()
    assert register(c, "bob").status_code == 201
    assert c.get("/api/auth/me").json["username"] == "bob"
    assert c.post("/api/auth/logout", headers=H).status_code == 200
    assert c.get("/api/auth/me").status_code == 401
    r = c.post("/api/auth/login", headers=H, json={"username": "BOB@example.com", "password": "Cotton2026"})
    assert r.status_code == 200


def test_password_policy_and_duplicates():
    c = client()
    assert register(c, "carol", pw="short").status_code == 422
    assert register(c, "carol", pw="onlyletters").status_code == 422
    assert register(c, "carol").status_code == 201
    assert register(client(), "carol").status_code == 409


def test_refresh_rotation_and_reuse_detection():
    c = client()
    register(c, "dave")
    old_rt = c.get_cookie("cl_rt", path="/api/auth").value
    assert c.post("/api/auth/refresh", headers=H).status_code == 200
    new_rt = c.get_cookie("cl_rt", path="/api/auth").value
    assert new_rt != old_rt
    # Re-using the old token after the grace window = theft → whole family revoked.
    db = SessionLocal()
    for t in db.query(RefreshToken).filter(RefreshToken.revoked_at.isnot(None)).all():
        t.replaced_at = datetime.utcnow() - timedelta(minutes=5)
    db.commit(); db.close()
    thief = client()
    thief.set_cookie("cl_rt", old_rt, path="/api/auth")
    assert thief.post("/api/auth/refresh", headers=H).status_code == 401
    assert c.post("/api/auth/refresh", headers=H).status_code == 401   # legit token died too


def test_expired_access_token_reports_code():
    import jwt, config
    c = client()
    register(c, "erin")
    db = SessionLocal(); u = db.query(User).filter_by(username="erin").one(); db.close()
    expired = jwt.encode({"sub": str(u.id), "ver": 0, "typ": "access",
                          "exp": datetime.utcnow() - timedelta(seconds=5)}, config.SECRET_KEY, "HS256")
    c.set_cookie("cl_at", expired)
    r = c.get("/api/auth/me")
    assert r.status_code == 401 and r.json["code"] == "token_expired"
    assert c.post("/api/auth/refresh", headers=H).status_code == 200
    assert c.get("/api/auth/me").status_code == 200


def test_change_password_signs_out_other_devices():
    a, b = client(), client()
    register(a, "frank")
    b.post("/api/auth/login", headers=H, json={"username": "frank", "password": "Cotton2026"})
    assert b.get("/api/auth/me").status_code == 200
    r = a.post("/api/auth/change-password", headers=H,
               json={"current_password": "Cotton2026", "new_password": "Cotton2027"})
    assert r.status_code == 200
    assert a.get("/api/auth/me").status_code == 200          # this device stays in
    assert b.get("/api/auth/me").status_code == 401          # other device is out
    assert b.post("/api/auth/refresh", headers=H).status_code == 401


def test_lockout_after_failed_logins():
    c = client()
    register(c, "gina")
    for _ in range(5):
        c.post("/api/auth/login", headers=H, json={"username": "gina", "password": "wrongpass1"})
    r = c.post("/api/auth/login", headers=H, json={"username": "gina", "password": "Cotton2026"})
    assert r.status_code == 429


def test_password_reset_flow_and_attempt_limit():
    c = client()
    register(c, "hana")
    assert c.post("/api/auth/forgot-password", headers=H, json={"username": "hana"}).status_code == 200
    code = code_from_last_email()
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(4):
        assert c.post("/api/auth/verify-otp", headers=H, json={"username": "hana", "otp": wrong}).status_code == 400
    assert c.post("/api/auth/verify-otp", headers=H, json={"username": "hana", "otp": code}).status_code == 200
    r = c.post("/api/auth/reset-password", headers=H,
               json={"username": "hana", "otp": code, "new_password": "NewCotton9"})
    assert r.status_code == 200
    assert c.get("/api/auth/me").status_code == 401          # old session ended
    assert c.post("/api/auth/login", headers=H, json={"username": "hana", "password": "NewCotton9"}).status_code == 200
    # Code is single-use.
    assert c.post("/api/auth/reset-password", headers=H,
                  json={"username": "hana", "otp": code, "new_password": "Another99"}).status_code == 400


def test_otp_dies_after_five_wrong_codes():
    c = client()
    register(c, "ivan")
    c.post("/api/auth/forgot-password", headers=H, json={"username": "ivan"})
    code = code_from_last_email()
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        c.post("/api/auth/verify-otp", headers=H, json={"username": "ivan", "otp": wrong})
    assert c.post("/api/auth/verify-otp", headers=H, json={"username": "ivan", "otp": code}).status_code == 400


def test_history_is_private_per_user():
    a, b = client(), client()
    register(a, "jane"); register(b, "karl")
    payload = {"farm_id": "F-001", "farmer_name": "Ali", "season": "2025-26", "total_co2_equiv": 1234.5,
               "breakdown": {"fert": 1000, "resid": 234.5}, "results": {"iSeed": 1.2, "water": 10},
               "fertiliser_data": {"applications": [{"product": "Urea (46% N)", "qty": 50}]}}
    r = a.post("/api/history/save", headers=H, json=payload)
    assert r.status_code == 201
    cid = r.json["id"]
    # Same farm ID for a different user must work (was a 500 before).
    assert b.post("/api/history/save", headers=H, json=payload).status_code == 201
    assert len(a.get("/api/history/").json) == 1
    assert b.get(f"/api/history/{cid}").status_code == 404
    assert b.delete(f"/api/history/{cid}", headers=H).status_code == 404
    one = a.get(f"/api/history/{cid}").json
    assert one["fertiliser_data"]["applications"][0]["product"] == "Urea (46% N)"
    assert one["breakdown"]["fert"] == 1000
    assert a.delete(f"/api/history/{cid}", headers=H).status_code == 200


def test_clear_history_with_code():
    c = client()
    register(c, "lena")
    c.post("/api/history/save", headers=H, json={"farm_id": "X", "season": "S", "total_co2_equiv": 5})
    assert c.post("/api/history/request-clear", headers=H).status_code == 200
    assert c.post("/api/history/verify-clear", headers=H, json={"otp": code_from_last_email()}).status_code == 200
    assert c.get("/api/history/").json == []


def test_chat_requires_login_and_contact_escapes_html():
    c = client()
    assert c.post("/api/chat/ask", headers=H, json={"message": "hi"}).status_code == 401
    r = c.post("/api/contact/send", headers=H, json={"category": "info", "name": "<script>x</script>",
                                                    "email": "a@b.co", "message": "hello <b>there</b>"})
    assert r.status_code == 200
    assert "<script>" not in SENT[-1][2] and "&lt;script&gt;" in SENT[-1][2]
    assert SENT[-1][0] == "sawie.info@gmail.com"


def test_report_download_rejects_bad_ids():
    c = client()
    register(c, "mona")
    assert c.get("/api/reports/..%2f..%2fapp/download").status_code == 404


def test_security_headers_on_index():
    r = client().get("/")
    assert r.status_code == 200
    assert "Content-Security-Policy" in r.headers and r.headers["X-Frame-Options"] == "DENY"


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); print("PASS", name)
            except Exception as exc:                    # noqa: BLE001
                fails += 1; print("FAIL", name, repr(exc))
    sys.exit(1 if fails else 0)
