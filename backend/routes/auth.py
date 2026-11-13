"""Authentication: register, sign in, refresh, sign out, password change and reset."""
import logging
from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

import mailer
from auth_utils import (
    OTP_MINUTES, REFRESH_COOKIE, burn_time, check_otp, clear_session_cookies,
    create_access_token, hash_password, issue_refresh_token, login_required, new_otp,
    purge_expired_tokens, revoke_all_sessions, revoke_refresh_family, rotate_refresh_token,
    set_session_cookies, user_dict, verify_password,
)
from database import session_scope
from models import OtpCode, User
from security import (
    USERNAME_RE, clean_str, hit_limit, json_body, password_problem, rate_limit, valid_email,
)

__all__ = ["auth_bp", "login_required"]   # other modules import login_required from here

auth_bp = Blueprint("auth", __name__)
log = logging.getLogger("carbonlens.auth")

MAX_FAILED_LOGINS = 5
LOCK_MINUTES = 15


def _find_user(db, ident: str):
    ident = (ident or "").strip()
    if not ident:
        return None
    if "@" in ident:
        return db.query(User).filter(func.lower(User.email) == ident.lower()).first()
    return db.query(User).filter(User.username == ident).first()


def _start_session(db, user: User, remember: bool, status: int = 200):
    refresh = issue_refresh_token(db, user, remember)
    access = create_access_token(user)
    resp = jsonify({"user": user_dict(user)})
    set_session_cookies(resp, access, refresh, remember)
    return resp, status


# ─── Register ────────────────────────────────────────────────────────────────
@auth_bp.post("/register")
@rate_limit(5, 600, "register")
def register():
    data = json_body()
    username = clean_str(data.get("username"), 40)
    email = clean_str(data.get("email"), 254).lower()
    full_name = clean_str(data.get("full_name"), 120)
    password = data.get("password") or ""

    if not full_name:
        return jsonify({"detail": "Please enter your full name."}), 422
    if not USERNAME_RE.match(username):
        return jsonify({"detail": "Username must be 3-40 characters: letters, numbers, dot, dash or underscore."}), 422
    if not valid_email(email):
        return jsonify({"detail": "Please enter a valid email address."}), 422
    problem = password_problem(password)
    if problem:
        return jsonify({"detail": problem}), 422

    with session_scope() as db:
        if db.query(User).filter(func.lower(User.email) == email).first():
            return jsonify({"detail": "This email already has an account. Sign in, or use Forgot password."}), 409
        if db.query(User).filter(func.lower(User.username) == username.lower()).first():
            return jsonify({"detail": "This username is taken. Please choose another."}), 409
        user = User(username=username, email=email, full_name=full_name,
                    hashed_password=hash_password(password))
        db.add(user)
        db.flush()
        remember = bool(data.get("remember"))
        return _start_session(db, user, remember, 201)


# ─── Sign in ─────────────────────────────────────────────────────────────────
@auth_bp.post("/login")
@rate_limit(10, 60, "login")
def login():
    data = json_body()
    ident = clean_str(data.get("username"), 254)
    password = data.get("password") or ""
    remember = bool(data.get("remember"))
    if not ident or not password:
        return jsonify({"detail": "Enter your username and password."}), 422

    with session_scope() as db:
        user = _find_user(db, ident)
        now = datetime.utcnow()
        if user and user.locked_until and user.locked_until > now:
            mins = int((user.locked_until - now).total_seconds() // 60) + 1
            return jsonify({"detail": f"Too many failed attempts. Try again in {mins} minute(s) or reset your password."}), 429
        if not user:
            burn_time()
            return jsonify({"detail": "Username or password is incorrect."}), 401
        if not verify_password(password, user.hashed_password):
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= MAX_FAILED_LOGINS:
                user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
                user.failed_logins = 0
                log.warning("Account %s locked after repeated failed sign-ins", user.id)
            return jsonify({"detail": "Username or password is incorrect."}), 401
        if not user.is_active:
            return jsonify({"detail": "This account is disabled."}), 403

        user.failed_logins = 0
        user.locked_until = None
        user.last_login_at = now
        purge_expired_tokens(db)
        return _start_session(db, user, remember)


# ─── Refresh (rotates the refresh token) ─────────────────────────────────────
@auth_bp.post("/refresh")
@rate_limit(30, 60, "refresh")
def refresh():
    raw = request.cookies.get(REFRESH_COOKIE)
    with session_scope() as db:
        user, new_raw, remember, err = rotate_refresh_token(db, raw)
        if err:
            resp = jsonify({"detail": "Your session has ended. Please sign in again.", "code": err})
            clear_session_cookies(resp)
            return resp, 401
        resp = jsonify({"user": user_dict(user)})
        set_session_cookies(resp, create_access_token(user), new_raw, remember)
        return resp


@auth_bp.post("/logout")
def logout():
    with session_scope() as db:
        revoke_refresh_family(db, request.cookies.get(REFRESH_COOKIE))
    resp = jsonify({"detail": "ok"})
    clear_session_cookies(resp)
    return resp


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(user_dict(g.current_user))


# ─── Change password (signed in) ─────────────────────────────────────────────
@auth_bp.post("/change-password")
@login_required
@rate_limit(5, 600, "change_pw", key_func=lambda: str(g.current_user.id))
def change_password():
    data = json_body()
    current = data.get("current_password") or ""
    new = data.get("new_password") or ""
    if not current or not new:
        return jsonify({"detail": "Enter your current and new password."}), 422
    problem = password_problem(new)
    if problem:
        return jsonify({"detail": problem}), 422
    with session_scope() as db:
        user = db.get(User, g.current_user.id)
        if not user or not verify_password(current, user.hashed_password):
            return jsonify({"detail": "Current password is incorrect."}), 401
        if verify_password(new, user.hashed_password):
            return jsonify({"detail": "The new password must be different from the current one."}), 422
        user.hashed_password = hash_password(new)
        revoke_all_sessions(db, user)          # signs out every other device
        refresh = issue_refresh_token(db, user, remember=False)   # keep this device signed in
        resp = jsonify({"detail": "ok", "user": user_dict(user),
                        "message": "Password changed. Other devices have been signed out."})
        set_session_cookies(resp, create_access_token(user), refresh, remember=False)
        return resp


# ─── Forgot password: 1) send code  2) verify code  3) set new password ──────
@auth_bp.post("/forgot-password")
@rate_limit(5, 900, "forgot")
def forgot_password():
    data = json_body()
    ident = clean_str(data.get("username"), 254)
    if not ident:
        return jsonify({"detail": "Enter your username or email."}), 422
    if not mailer.configured():
        return jsonify({"detail": "Email is not set up on this server yet. Please contact sawie.info@gmail.com."}), 503

    generic = {"detail": "ok",
               "message": "If an account matches, a 6-digit code has been sent to its email. Check your inbox and spam folder."}
    with session_scope() as db:
        user = _find_user(db, ident)
        if not user or not user.is_active:
            return jsonify(generic)
        # At most 3 codes per account per hour, whoever asks.
        if hit_limit(f"otp_reset:{user.id}", 3, 3600):
            return jsonify(generic)
        code = new_otp(db, user, "reset")
        sent = mailer.send(user.email, "CarbonLens password reset code",
                           mailer.otp_email(user.full_name or user.username, code,
                                            "reset your CarbonLens password", OTP_MINUTES))
        if not sent:
            db.query(OtpCode).filter(OtpCode.user_id == user.id, OtpCode.purpose == "reset").delete()
            return jsonify({"detail": "We could not send the email right now. Please try again in a few minutes."}), 502
    return jsonify(generic)


@auth_bp.post("/verify-otp")
@rate_limit(10, 600, "verify_otp")
def verify_otp():
    data = json_body()
    ident = clean_str(data.get("username"), 254)
    code = clean_str(data.get("otp"), 6)
    if not ident or not code.isdigit() or len(code) != 6:
        return jsonify({"detail": "Enter the 6-digit code from the email."}), 422
    with session_scope() as db:
        user = _find_user(db, ident)
        if not user:
            return jsonify({"detail": "Incorrect or expired code."}), 400
        ok, msg = check_otp(db, user, "reset", code, consume=False)
        if not ok:
            return jsonify({"detail": msg}), 400
    return jsonify({"detail": "ok", "message": "Code verified. Choose a new password."})


@auth_bp.post("/reset-password")
@rate_limit(10, 600, "reset_pw")
def reset_password():
    data = json_body()
    ident = clean_str(data.get("username"), 254)
    code = clean_str(data.get("otp"), 6)
    new = data.get("new_password") or ""
    problem = password_problem(new)
    if problem:
        return jsonify({"detail": problem}), 422
    with session_scope() as db:
        user = _find_user(db, ident)
        row = None
        if user:
            row = (db.query(OtpCode).filter(OtpCode.user_id == user.id, OtpCode.purpose == "reset")
                   .order_by(OtpCode.id.desc()).first())
        if not user or not row or not row.verified:
            return jsonify({"detail": "Please verify the code first."}), 400
        ok, msg = check_otp(db, user, "reset", code, consume=True)
        if not ok:
            return jsonify({"detail": msg}), 400
        user.hashed_password = hash_password(new)
        user.failed_logins = 0
        user.locked_until = None
        revoke_all_sessions(db, user)
    return jsonify({"detail": "ok", "message": "Password updated. You can sign in now."})
