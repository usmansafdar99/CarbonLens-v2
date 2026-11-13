"""Production entry point.

Linux hosts (Render, Railway, a VPS):   gunicorn --chdir backend wsgi:app -w 2 -b 0.0.0.0:$PORT
Windows server:                         waitress-serve --listen=0.0.0.0:8000 --call wsgi:get_app
"""
from app import app


def get_app():
    return app
