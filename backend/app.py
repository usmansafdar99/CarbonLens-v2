"""CarbonLens API server.

Serves the JSON API under /api and, by default, the static frontend from ../frontend,
so the whole app runs on one origin (simplest for secure cookies). The frontend can also
be hosted elsewhere: set ALLOWED_ORIGINS and point the frontend's API base at this server.
"""
import logging
import os
import sys

from flask import Flask, abort, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

import config
from migrate import run_migrations
from routes.auth import auth_bp
from routes.calculations import calc_bp
from routes.chatbot import chatbot_bp
from routes.contact import contact_bp
from routes.farms import farms_bp
from routes.history import history_bp
from routes.reports import reports_bp
from routes.widgets import warm_news_cache, widgets_bp

logging.basicConfig(level=logging.INFO if not config.DEBUG else logging.DEBUG,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
for noisy in ("urllib3", "werkzeug"):
    logging.getLogger(noisy).setLevel(logging.WARNING)
log = logging.getLogger("carbonlens")

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_HEADER = "X-CL-Request"

CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",          # inline onclick handlers in index.html
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",          # news images may load straight from sawie.net
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
])


def create_app() -> Flask:
    run_migrations()

    app = Flask(__name__, static_folder=None)
    app.config.update(
        SECRET_KEY=config.SECRET_KEY,
        MAX_CONTENT_LENGTH=config.MAX_CONTENT_LENGTH,
        JSON_SORT_KEYS=False,
    )
    # Behind Render / Railway / Nginx: trust ONE proxy hop for client IP and https.
    if config.IS_PRODUCTION or os.getenv("BEHIND_PROXY", "").lower() in ("1", "true", "yes"):
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    if config.ALLOWED_ORIGINS:
        CORS(app, resources={r"/api/*": {"origins": config.ALLOWED_ORIGINS}},
             supports_credentials=True, allow_headers=["Content-Type", CSRF_HEADER])

    for bp, prefix in ((auth_bp, "/api/auth"), (farms_bp, "/api/farms"), (calc_bp, "/api/farms"),
                       (reports_bp, "/api/reports"), (chatbot_bp, "/api/chat"),
                       (contact_bp, "/api/contact"), (widgets_bp, "/api/widgets"),
                       (history_bp, "/api/history")):
        app.register_blueprint(bp, url_prefix=prefix)

    # ── CSRF: state-changing API calls must carry a custom header. Browsers never add it to
    # cross-site form posts, and cross-origin scripts cannot add it without passing CORS.
    @app.before_request
    def csrf_guard():
        if request.method in UNSAFE_METHODS and request.path.startswith("/api/"):
            if request.headers.get(CSRF_HEADER) != "1":
                return jsonify({"detail": "Request blocked (missing security header). Refresh the page."}), 403
        return None

    @app.after_request
    def security_headers(resp):
        h = resp.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Permissions-Policy", "geolocation=(self), camera=(), microphone=(), payment=()")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if resp.mimetype == "text/html":
            h.setdefault("Content-Security-Policy", CSP)
        if request.is_secure:
            h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if request.path.startswith("/api/") and "Cache-Control" not in h:
            h["Cache-Control"] = "no-store"
        return resp

    @app.errorhandler(HTTPException)
    def http_error(exc):
        if request.path.startswith("/api/"):
            return jsonify({"detail": exc.description or exc.name}), exc.code
        return exc

    @app.errorhandler(Exception)
    def unhandled(exc):
        log.exception("Unhandled error on %s %s", request.method, request.path)
        return jsonify({"detail": "Something went wrong on the server. Please try again."}), 500

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "CarbonLens"}

    # ── Frontend ─────────────────────────────────────────────────────────────
    front = config.FRONTEND_DIR

    @app.get("/")
    def index():
        resp = send_from_directory(front, "index.html", max_age=0)
        resp.headers["Cache-Control"] = "no-cache"
        return resp

    @app.get("/static/<path:filename>")
    def static_files(filename):
        resp = send_from_directory(front / "static", filename, max_age=3600)
        return resp

    @app.get("/<path:anything>")
    def spa_fallback(anything):
        if anything.startswith("api/"):
            abort(404)
        return index()

    warm_news_cache()
    log.info("CarbonLens ready (env=%s, db=%s)", config.ENV, config.DATABASE_URL.split("://")[0])
    return app


app = create_app()


if __name__ == "__main__":
    url = f"http://{'localhost' if config.HOST in ('0.0.0.0', '127.0.0.1') else config.HOST}:{config.PORT}"
    print(f"\n  CarbonLens is running at  {url}\n  Press Ctrl+C to stop.\n", flush=True)
    if config.DEBUG:
        app.run(host=config.HOST, port=config.PORT, debug=True, use_reloader="--no-reload" not in sys.argv)
    else:
        from waitress import serve
        serve(app, host=config.HOST, port=config.PORT, threads=8)
