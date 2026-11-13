"""Passwords, access tokens, rotating refresh tokens, session cookies and the login guard.

Session model
-------------
* ``cl_at``  short-lived access token (JWT, 15 min). HttpOnly cookie, sent with every API call.
* ``cl_rt``  long-lived refresh token (random 256-bit string). HttpOnly cookie, only sent to
  ``/api/auth``. Stored in the database as a SHA-256 hash, rotated on every use.

When the access token expires the page calls ``POST /api/auth/refresh`` and gets a new pair.
Re-using an old refresh token (a sign of theft) revokes every token from that sign-in.
Changing or resetting the password bumps ``users.token_version`` so all old access tokens die.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from functools import wraps

import bcrypt
import jwt
from flask import g, jsonify, request

import config
from database import SessionLocal
from models import OtpCode, RefreshToken, User

ALGORITHM = "HS256"
ACCESS_COOKIE = "cl_at"
REFRESH_COOKIE = "cl_rt"
REFRESH_PATH = "/api/auth"
REUSE_GRACE_SECONDS = 30   # two tabs refreshing at the same moment is not theft


# ─── Passwords ───────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], (hashed or "").encode("ascii"))
    except (ValueError, TypeError):
        return False


# Constant-time dummy so "unknown user" and "wrong password" take the same time.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def burn_time():
    verify_password("x", _DUMMY_HASH)


# ─── Access tokens ───────────────────────────────────────────────────────────
def create_access_token(user: User) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": str(user.id),
        "ver": user.token_version or 0,
        "typ": "access",
        "iat": now,
        "exp": now + timedelta(minutes=config.ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
    """Returns (payload, error). error is 'expired' or 'invalid'."""
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[ALGORITHM],
                             options={"require": ["exp", "sub", "typ"]})
        if payload.get("typ") != "access":
            return None, "invalid"
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "expired"
    except jwt.PyJWTError:
        return None, "invalid"


# ─── Refresh tokens ──────────────────────────────────────────────────────────
def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def issue_refresh_token(db, user: User, remember: bool, family_id: str | None = None,
                        expires_at: datetime | None = None) -> str:
    raw = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    if expires_at is None:
        expires_at = now + (timedelta(days=config.REMEMBER_DAYS) if remember
                            else timedelta(hours=config.SESSION_HOURS))
    db.add(RefreshToken(
        user_id=user.id, token_hash=_hash_token(raw), family_id=family_id or secrets.token_hex(16),
        remember=remember, created_at=now, expires_at=expires_at,
        user_agent=(request.headers.get("User-Agent") or "")[:255],
        ip=(request.remote_addr or "")[:64],
    ))
    return raw


def rotate_refresh_token(db, raw: str):
    """Validate a refresh token and swap it for a new one.

    Returns (user, new_raw_token_or_None, remember, error). new token is None inside the
    reuse grace window (another tab already rotated it; that tab's cookie is current).
    """
    if not raw:
        return None, None, False, "missing"
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_token(raw)).first()
    now = datetime.utcnow()
    if not row:
        return None, None, False, "invalid"
    user = db.get(User, row.user_id)
    if not user or not user.is_active:
        return None, None, False, "invalid"
    if row.revoked_at:
        if row.replaced_at and (now - row.replaced_at).total_seconds() <= REUSE_GRACE_SECONDS:
            return user, None, row.remember, None
        # Old token presented again: assume it was stolen, end that whole sign-in.
        db.query(RefreshToken).filter(RefreshToken.family_id == row.family_id,
                                      RefreshToken.revoked_at.is_(None)).update({"revoked_at": now})
        return None, None, False, "reused"
    if row.expires_at <= now:
        return None, None, False, "expired"
    row.revoked_at = now
    row.replaced_at = now
    # "Keep me signed in" slides forward; a normal session keeps its original end time.
    new_exp = None if row.remember else row.expires_at
    new_raw = issue_refresh_token(db, user, row.remember, family_id=row.family_id, expires_at=new_exp)
    return user, new_raw, row.remember, None


def revoke_refresh_family(db, raw: str):
    if not raw:
        return
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_token(raw)).first()
    if row:
        db.query(RefreshToken).filter(RefreshToken.family_id == row.family_id,
                                      RefreshToken.revoked_at.is_(None)).update(
            {"revoked_at": datetime.utcnow()})


def revoke_all_sessions(db, user: User):
    """End every session of a user (password change / reset)."""
    user.token_version = (user.token_version or 0) + 1
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id,
                                  RefreshToken.revoked_at.is_(None)).update(
        {"revoked_at": datetime.utcnow()})


def purge_expired_tokens(db):
    cutoff = datetime.utcnow() - timedelta(days=2)
    db.query(RefreshToken).filter(RefreshToken.expires_at < cutoff).delete(synchronize_session=False)
    db.query(OtpCode).filter(OtpCode.expires_at < cutoff).delete(synchronize_session=False)


# ─── Cookies ─────────────────────────────────────────────────────────────────
def _secure() -> bool:
    return config.COOKIE_SECURE or request.is_secure


def set_session_cookies(resp, access: str, refresh: str | None, remember: bool):
    resp.set_cookie(ACCESS_COOKIE, access, max_age=config.ACCESS_TOKEN_MINUTES * 60,
                    httponly=True, secure=_secure(), samesite="Lax", path="/")
    if refresh:
        max_age = config.REMEMBER_DAYS * 86400 if remember else None   # None = browser session
        resp.set_cookie(REFRESH_COOKIE, refresh, max_age=max_age, httponly=True,
                        secure=_secure(), samesite="Lax", path=REFRESH_PATH)
    return resp


def clear_session_cookies(resp):
    resp.delete_cookie(ACCESS_COOKIE, path="/", samesite="Lax")
    resp.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH, samesite="Lax")
    # Cookie from the previous version of the app.
    resp.delete_cookie("cl_session", path="/", samesite="Lax")
    return resp


# ─── Login guard ─────────────────────────────────────────────────────────────
def _unauthorized(code: str, msg: str):
    resp = jsonify({"detail": msg, "code": code})
    return resp, 401


def current_user_from_request():
    """Returns (user, error_code)."""
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
    if not token:
        return None, "not_authenticated"
    payload, err = decode_access_token(token)
    if err:
        return None, "token_expired" if err == "expired" else "invalid_token"
    db = SessionLocal()
    try:
        try:
            user = db.get(User, int(payload["sub"]))
        except (TypeError, ValueError):
            return None, "invalid_token"
        if not user or not user.is_active:
            return None, "invalid_token"
        if (user.token_version or 0) != payload.get("ver", 0):
            return None, "session_revoked"
        return user, None
    finally:
        db.close()


def login_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        user, err = current_user_from_request()
        if not user:
            msgs = {"not_authenticated": "Please sign in.",
                    "token_expired": "Session needs refreshing.",
                    "session_revoked": "Your session has ended. Please sign in again."}
            return _unauthorized(err, msgs.get(err, "Please sign in again."))
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapped


# ─── One-time codes ──────────────────────────────────────────────────────────
OTP_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def new_otp(db, user: User, purpose: str) -> str:
    db.query(OtpCode).filter(OtpCode.user_id == user.id, OtpCode.purpose == purpose).delete()
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(OtpCode(user_id=user.id, purpose=purpose, code_hash=_otp_hash(user.id, purpose, code),
                   expires_at=datetime.utcnow() + timedelta(minutes=OTP_MINUTES)))
    return code


def _otp_hash(user_id: int, purpose: str, code: str) -> str:
    return hmac.new(config.SECRET_KEY.encode(), f"{user_id}:{purpose}:{code}".encode(),
                    hashlib.sha256).hexdigest()


def check_otp(db, user: User, purpose: str, code: str, consume: bool):
    """Returns (ok, message). Counts attempts; 5 wrong codes kill the code."""
    row = (db.query(OtpCode).filter(OtpCode.user_id == user.id, OtpCode.purpose == purpose)
           .order_by(OtpCode.id.desc()).first())
    if not row:
        return False, "No code was requested, or it has already been used. Request a new one."
    if row.expires_at <= datetime.utcnow():
        db.delete(row)
        return False, "This code has expired. Request a new one."
    if not hmac.compare_digest(row.code_hash, _otp_hash(user.id, purpose, (code or "").strip())):
        row.attempts += 1
        if row.attempts >= OTP_MAX_ATTEMPTS:
            db.delete(row)
            return False, "Too many wrong attempts. Request a new code."
        left = OTP_MAX_ATTEMPTS - row.attempts
        return False, f"Incorrect code. {left} attempt{'s' if left != 1 else ''} left."
    if consume:
        db.delete(row)
    else:
        row.verified = True
    return True, "ok"


def user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name or "",
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }
