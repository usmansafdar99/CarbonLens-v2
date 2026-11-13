"""Central configuration. Every setting comes from the environment (.env)."""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
INSTANCE_DIR = BACKEND_DIR / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)

# backend/.env wins; a project-root .env is also accepted.
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(PROJECT_DIR / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = ENV == "production"
DEBUG = _bool("DEBUG", not IS_PRODUCTION) and not IS_PRODUCTION
HOST = os.getenv("HOST", "127.0.0.1")
PORT = _int("PORT", 8000)


def _secret_key() -> str:
    key = os.getenv("SECRET_KEY", "").strip()
    weak = (not key) or key.startswith("change-this") or len(key) < 32
    if not weak:
        return key
    if IS_PRODUCTION:
        raise RuntimeError(
            "SECRET_KEY is missing or too short. Set a random value of 32+ characters "
            "in the environment before starting in production."
        )
    # Development: generate once and keep it, so sessions survive restarts.
    key_file = INSTANCE_DIR / ".secret_key"
    if key_file.exists():
        return key_file.read_text().strip()
    key = secrets.token_urlsafe(48)
    key_file.write_text(key)
    return key


SECRET_KEY = _secret_key()

# ── Database ────────────────────────────────────────────────────────────────
_default_db = f"sqlite:///{(INSTANCE_DIR / 'carbonlens.db').as_posix()}"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or _default_db
if DATABASE_URL.startswith("postgres://"):           # Heroku/Render style URLs
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]
if DATABASE_URL.startswith("sqlite:///./"):          # old relative path → instance/
    DATABASE_URL = f"sqlite:///{(INSTANCE_DIR / DATABASE_URL[len('sqlite:///./'):]).as_posix()}"

# ── Sessions ────────────────────────────────────────────────────────────────
ACCESS_TOKEN_MINUTES = _int("ACCESS_TOKEN_MINUTES", 15)
SESSION_HOURS = _int("SESSION_HOURS", 12)            # without "keep me signed in"
REMEMBER_DAYS = _int("REMEMBER_DAYS", 30)            # with "keep me signed in"
# Secure cookies need HTTPS. Auto-on in production, can be forced either way.
COOKIE_SECURE = _bool("COOKIE_SECURE", IS_PRODUCTION)

# ── CORS (only needed if the frontend is hosted on a different domain) ─────
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

# ── Paths ───────────────────────────────────────────────────────────────────
FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", PROJECT_DIR / "frontend")).resolve()
REPORTS_DIR = Path(os.getenv("REPORT_STORAGE_PATH", INSTANCE_DIR / "reports")).resolve()
CACHE_DIR = INSTANCE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# ── Email (Brevo) ───────────────────────────────────────────────────────────
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
BREVO_FROM_EMAIL = os.getenv("BREVO_FROM_EMAIL", "sawie.info@gmail.com").strip()
BREVO_FROM_NAME = os.getenv("BREVO_FROM_NAME", "CarbonLens by SAWiE").strip()
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "sawie.info@gmail.com").strip()
CONTACT_EMAIL_INFO = os.getenv("CONTACT_EMAIL_INFO", SUPPORT_EMAIL).strip()
CONTACT_EMAIL_TECH = os.getenv("CONTACT_EMAIL_TECH", SUPPORT_EMAIL).strip()

# ── Assistant (Groq) ────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()

MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1 MB per request is plenty for this app
