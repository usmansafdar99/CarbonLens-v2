"""Shared security helpers: rate limiting, input validation, client IP, request guards."""
import html
import ipaddress
import re
import threading
import time
from collections import defaultdict, deque
from functools import wraps

from flask import jsonify, request

# ─── Rate limiting ───────────────────────────────────────────────────────────
# In-memory sliding window. Fine for one server process; for several processes
# behind a load balancer, move this to Redis.
_hits: dict = defaultdict(deque)
_lock = threading.Lock()


def _too_many(key: str, limit: int, window: int) -> int:
    """Record a hit. Returns 0 if allowed, else seconds until the next slot frees up."""
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return int(window - (now - q[0])) + 1
        q.append(now)
        if len(_hits) > 50_000:            # keep memory bounded
            for k in list(_hits)[:10_000]:
                if not _hits[k]:
                    del _hits[k]
        return 0


def rate_limit(limit: int, window: int, scope: str = "", key_func=None):
    """Decorator: at most `limit` calls per `window` seconds per client IP (or custom key)."""
    def deco(fn):
        @wraps(fn)
        def wrapped(*a, **kw):
            ident = key_func() if key_func else client_ip()
            wait = _too_many(f"{scope or fn.__name__}:{ident}", limit, window)
            if wait:
                resp = jsonify({"detail": f"Too many requests. Please wait {wait} seconds and try again."})
                resp.headers["Retry-After"] = str(wait)
                return resp, 429
            return fn(*a, **kw)
        return wrapped
    return deco


def hit_limit(key: str, limit: int, window: int) -> int:
    return _too_many(key, limit, window)


# ─── Client IP ───────────────────────────────────────────────────────────────
def client_ip() -> str:
    # ProxyFix (see app.py) already rewrote remote_addr from X-Forwarded-For when
    # the app runs behind a trusted proxy, so this cannot be spoofed by the client.
    return request.remote_addr or "0.0.0.0"


def is_public_ip(ip: str) -> bool:
    try:
        a = ipaddress.ip_address(ip)
        return not (a.is_private or a.is_loopback or a.is_link_local or a.is_reserved or a.is_multicast)
    except ValueError:
        return False


# ─── Validation ──────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(r"^[^\s@<>()\[\],;:\"]+@[^\s@<>()\[\],;:\"]+\.[A-Za-z]{2,}$")
USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,40}$")


def clean_str(v, max_len: int = 255) -> str:
    if v is None:
        return ""
    return str(v).strip()[:max_len]


def valid_email(v: str) -> bool:
    return bool(v) and len(v) <= 254 and bool(EMAIL_RE.match(v))


def password_problem(pw: str):
    """Return a message if the password is too weak, else None."""
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if len(pw.encode("utf-8")) > 72:
        return "Password is too long (72 bytes maximum)."
    if not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        return "Password must contain at least one letter and one number."
    return None


def to_float(v, default: float = 0.0, lo: float = 0.0, hi: float = 1e12) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    if f != f or f in (float("inf"), float("-inf")):   # NaN / inf
        return default
    return max(lo, min(hi, f))


def e(v) -> str:
    """HTML-escape user text before putting it into an email body."""
    return html.escape(str(v or ""), quote=True)


def json_body(max_keys: int = 200) -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or len(data) > max_keys:
        return {}
    return data
