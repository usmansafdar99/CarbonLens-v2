# CarbonLens

Farm-gate carbon footprint calculator for cotton and other field crops, built by
**SAWiE Ecosystems (Private) Limited** (Sustainable Agriculture Water and Intelligent Ecosystems).

A farmer or field officer enters one season of records (fertiliser, crop protection,
irrigation, machinery, residue, harvest) and gets total CO₂e, intensity per kg of seed
cotton and lint, the breakdown by source, water and labour, and a printable report.
Every calculation is saved to the user's own history.

---

## Quick start

**Windows:** double-click **`run.bat`**.
**macOS / Linux:** run `./run.sh`.

minute). After that the dashboard opens at **http://localhost:8000**. Close the window
(or press Ctrl+C) to stop.

You only need **Python 3.10 or newer** ([python.org](https://www.python.org/downloads/);
on Windows tick *Add python.exe to PATH* during setup).

### Manual start

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
cd backend
python app.py
```

---

## Project structure

```
CarbonLens/
├── run.bat / run.sh        one-click start (installs, starts backend + frontend, opens browser)
├── requirements.txt        installs everything (points to backend/requirements.txt)
├── README.md
├── frontend/               the website (static files, no build step)
│   ├── index.html          page markup
│   └── static/
│       ├── css/theme.css   design system and responsive layout
│       ├── js/app.js       dashboard logic, calculator engine (computeAll), API client
│       ├── js/data.js      reference data: districts/tehsils, fertilisers, emission factors
│       ├── js/theme.js     animations
│       ├── img/, fonts/, vendor/ (Chart.js, Motion; nothing loads from a CDN)
└── backend/                the API (Flask)
    ├── app.py              entry point; also serves ../frontend
    ├── wsgi.py             production entry point (gunicorn / waitress)
    ├── config.py           all settings, read from backend/.env
    ├── database.py         SQLAlchemy engine (SQLite locally, PostgreSQL in production)
    ├── models.py           users, sessions, one-time codes, farms, seasons, calculations
    ├── migrate.py          creates tables and upgrades older databases automatically
    ├── auth_utils.py       passwords, tokens, cookie sessions, login guard
    ├── security.py         rate limiting, validation
    ├── mailer.py           email through Brevo
    ├── calculator.py       server-side calculation engine (API use)
    ├── routes/             auth, history, farms, calculations, reports, contact, chat, widgets
    ├── tests/test_api.py   automated security and API tests
    ├── .env.example        template for settings (copy to .env)
    └── instance/           local database, cached news images (created automatically)
```

The backend serves the frontend from the same address, so the browser talks to one
origin. That keeps the secure cookies simple and needs no CORS. The frontend can also be
hosted on its own: set `ALLOWED_ORIGINS` on the backend and `window.CL_API_BASE` in
`index.html`.

---

## Settings (`backend/.env`)

| Setting | What it does |
|---|---|
| `SECRET_KEY` | Signs sessions. 32+ random characters. Required in production. |
| `DATABASE_URL` | Empty = SQLite file in `backend/instance/`. Production: a PostgreSQL URL. |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL` | Email for password reset, history-clear codes and the contact form. The sender must be verified in Brevo. |
| `SUPPORT_EMAIL`, `CONTACT_EMAIL_INFO`, `CONTACT_EMAIL_TECH` | Where contact-form messages go (`sawie.info@gmail.com`). |
| `GROQ_API_KEY` | Turns on the CarbonLens Assistant. |
| `APP_ENV` | `development` locally, `production` on the server. |

`backend/.env` holds secrets and is listed in `.gitignore`. Never commit it.

---

## Security

* **Sessions:** a 15-minute access token and a rotating refresh token, both in HttpOnly
  cookies that page scripts cannot read. The page renews the session automatically.
  "Keep me signed in" lasts 30 days; otherwise 12 hours.
* **Token theft detection:** re-using an old refresh token ends that whole sign-in.
* **Password change or reset** signs out every other device.
* **Passwords:** bcrypt, minimum 8 characters with a letter and a number.
* **Brute force:** rate limits on sign-in, sign-up, codes and contact form; an account
  locks for 15 minutes after 5 wrong passwords; one-time codes die after 5 wrong tries.
* **CSRF:** every state-changing request needs a custom header plus SameSite cookies.
* **Headers:** Content-Security-Policy, X-Frame-Options, HSTS on HTTPS, nosniff.
* **Privacy:** every query is limited to the signed-in user's own data.

Run the tests:

```bash
cd backend
python tests/test_api.py
```

---

## Weather and news

* **Weather** is detected automatically when the page opens: first from the network
  location (instant, no prompt), then from the device's GPS if the visitor allows it.
  It refreshes every 10 minutes. Data: Open-Meteo; place names: OpenStreetMap.
  Browsers only share GPS on **HTTPS** (or localhost), so the live site must use HTTPS.
* **News** comes from the sawie.net feed. The server downloads each article image once
  and serves it itself, so images load immediately and do not break.

---

## API overview

| Method | Path | Sign-in | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | | Create account (signs in) |
| POST | `/api/auth/login` | | Sign in (username or email) |
| POST | `/api/auth/refresh` | cookie | Renew session |
| POST | `/api/auth/logout` | | Sign out |
| GET | `/api/auth/me` | ✓ | Current user |
| POST | `/api/auth/change-password` | ✓ | Change password |
| POST | `/api/auth/forgot-password` → `/verify-otp` → `/reset-password` | | Reset by email code |
| POST | `/api/history/save` | ✓ | Save a calculation |
| GET | `/api/history/` · `/api/history/<id>` | ✓ | List / view saved calculations |
| DELETE | `/api/history/<id>` | ✓ | Delete one |
| POST | `/api/history/request-clear` → `/verify-clear` | ✓ | Delete all (email code) |
| POST | `/api/contact/send` | | Contact form |
| POST | `/api/chat/ask` | ✓ | Assistant |
| GET | `/api/widgets/weather` · `/api/widgets/news` | | Home page widgets |
| GET | `/api/health` | | Health check |

---

## Deployment (summary)

Recommended free setup: **Render** (web service) + **Neon** (PostgreSQL).

1. Create a Neon database and copy its connection string.
2. Push this folder to a private GitHub repository (`.env` stays out).
3. On Render create a *Web Service* from the repository:
   * Build command: `pip install -r requirements.txt`
   * Start command: `gunicorn --chdir backend wsgi:app -w 2 -b 0.0.0.0:$PORT`
   * Environment: `APP_ENV=production`, `SECRET_KEY=…`, `DATABASE_URL=…`,
     `BREVO_API_KEY=…`, `BREVO_FROM_EMAIL=sawie.info@gmail.com`, `GROQ_API_KEY=…`
4. Tables are created automatically on first start.

© 2026 SAWiE Ecosystems (Private) Limited.
