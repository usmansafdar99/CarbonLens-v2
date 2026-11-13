#!/usr/bin/env bash
# CarbonLens: one-command start for macOS / Linux.
set -e
cd "$(dirname "$0")"
PY=$(command -v python3 || command -v python)
[ -z "$PY" ] && { echo "Python 3.10+ is required."; exit 1; }
[ -x .venv/bin/python ] || "$PY" -m venv .venv
. .venv/bin/activate
if ! cmp -s backend/requirements.txt .venv/.installed; then
  echo "Installing requirements ..."
  python -m pip install -q --disable-pip-version-check --upgrade pip
  python -m pip install -q --disable-pip-version-check -r requirements.txt
  cp backend/requirements.txt .venv/.installed
fi
[ -f backend/.env ] || cp backend/.env.example backend/.env
PORT=$(grep -E '^PORT=' backend/.env | cut -d= -f2); PORT=${PORT:-8000}
echo "Starting CarbonLens on http://localhost:$PORT  (Ctrl+C to stop)"
( sleep 3; (command -v open >/dev/null && open "http://localhost:$PORT") || (command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT") ) >/dev/null 2>&1 &
cd backend && exec python app.py --no-reload
