# CarbonLens v3 — Railway (app) + Supabase (database)

Step by step, in order. About 30 minutes, most of it waiting.

**One service, not two.** CarbonLens is a single Flask app that serves the API *and* the
frontend from the same origin (`backend/app.py` serves `frontend/index.html` and
`frontend/static/*`). So Railway needs one service only, not a separate frontend deploy.
That is also the only setup where the secure session cookies work without CORS.

## Files already added to this project

| File | Purpose |
|---|---|
| `supabase_schema.sql` | Paste into Supabase SQL Editor to create the 8 tables |
| `railway.json` | Tells Railway how to build and start. No dashboard typing needed |
| `Procfile` | Same start command, for hosts that read a Procfile |
| `.python-version` | Pins Python 3.12 on the builder |
| `backend/.env.production.example` | Template for the Railway variables |
| `DEPLOY-RAILWAY-SUPABASE.md` | This guide |

---

# Part A — Supabase database

## A1. Create the project

1. supabase.com -> sign in -> **New project**.
2. Name: `carbonlens`.
3. **Database password:** click Generate, then copy it into your password manager
   immediately. You cannot read it back later, only reset it.
4. **Region:** same continent as your Railway region. `West EU (London)` pairs well
   with Railway's `europe-west4`. A mismatched region adds latency to every query.
5. Create, and wait about two minutes.

## A2. Create the tables

1. Sidebar -> **SQL Editor** -> **New query**.
2. Open `supabase_schema.sql`, copy everything, paste it in.
3. **Run**. You should see "Success. No rows returned".
4. Check **Table Editor**: eight tables — `users`, `refresh_tokens`, `otp_codes`,
   `farms`, `seasons`, `emissions`, `calculations`, `contact_messages`.

That script also enables Row Level Security with no policies and revokes `anon` and
`authenticated` on every table. Keep that. Supabase publishes the `public` schema over
its REST API using the anon key, and `users` holds bcrypt password hashes while
`refresh_tokens` holds live sessions. CarbonLens never uses Supabase Auth or that REST
API, so closing the door costs nothing.

## A3. Copy the connection string

1. **Project Settings** (gear) -> **Database**.
2. **Connection string** -> **URI** tab.
3. Set the mode selector to **Session pooler**. The host ends in `pooler.supabase.com`,
   port `5432`.
4. Replace `[YOUR-PASSWORD]` with the real password and append `?sslmode=require`:

```
postgresql://postgres.abcdefghijklm:MyPassword@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require
```

Three things that break this step, most common first:

- **Do not use the direct host** `db.<ref>.supabase.co`. It is IPv6-only; Railway is
  IPv4, so you get a DNS or connection-refused error. The pooler host works.
- **URL-encode special characters in the password:** `@` -> `%40`, `#` -> `%23`,
  `/` -> `%2F`, `:` -> `%3A`. An unencoded `@` makes the URL parse as a different host.
  Simplest fix: reset the password to letters and digits only.
- **Session pooler (5432), not Transaction pooler (6543).** SQLAlchemy keeps its own
  connection pool, which is what the session pooler expects.

## A4. Test locally before deploying

Catches a bad connection string in 30 seconds instead of after a failed deploy.

Put the URL in `backend/.env`:

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Then:

```bash
cd backend
pip install -r requirements.txt
python -c "from migrate import run_migrations; run_migrations(); print('schema ok')"
python app.py
```

Open http://localhost:8000, register an account, save one calculation, then check
Supabase **Table Editor -> users** for the row. If it is there, the database half is done.

`could not translate host name` means you used the direct host — go back to A3.
`password authentication failed` means the password is wrong or not URL-encoded.

---

# Part B — Railway

## B1. Push to GitHub

Railway deploys from a repository.

**Before pushing, confirm `backend/.env` is excluded.** It holds your live Brevo and
Groq keys. It is in `.gitignore`, but verify:

```bash
cd CarbonLens-v3
git init
git add .
git status --short | grep "\.env$"      # must print NOTHING
```

If it prints `backend/.env`, run `git rm --cached backend/.env` before committing. Then:

```bash
git commit -m "CarbonLens v3"
git branch -M main
git remote add origin https://github.com/<you>/carbonlens.git
git push -u origin main
```

Keep the repository **private**.

## B2. Create the Railway service

1. railway.app -> sign in with GitHub -> **New Project**.
2. **Deploy from GitHub repo** -> authorise -> pick `carbonlens`.
3. The first build starts immediately and **will not work yet**, because the variables
   are not set. That is expected. Go to B3.

`railway.json` already tells Railway to install `backend/requirements.txt` and start
with gunicorn, so there is no start command to type in the dashboard.

## B3. Set the environment variables

Service -> **Variables** -> **Raw Editor**, paste and fill in:

```
APP_ENV=production
DEBUG=false
HOST=0.0.0.0
SECRET_KEY=<generated value, see below>
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
COOKIE_SECURE=true
BREVO_API_KEY=<your key>
BREVO_FROM_EMAIL=sawie.info@gmail.com
BREVO_FROM_NAME=CarbonLens by SAWiE
SUPPORT_EMAIL=sawie.info@gmail.com
CONTACT_EMAIL_INFO=sawie.info@gmail.com
CONTACT_EMAIL_TECH=sawie.info@gmail.com
GROQ_API_KEY=<your key>
GROQ_MODEL=openai/gpt-oss-20b
```

Generate `SECRET_KEY` on your own machine:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Two notes:

- **Do not set `PORT`.** Railway injects it and the start command reads `$PORT`.
  Setting it yourself makes the health check fail.
- `SECRET_KEY` must be 32+ characters or the app refuses to start in production. That
  check is deliberate, in `backend/config.py`. Changing the value later signs everyone
  out, which is correct if it ever leaks.

Save. Railway redeploys automatically.

## B4. Give it a public URL

Service -> **Settings** -> **Networking** -> **Generate Domain**. Port `8080` if asked.
You get `carbonlens-production-xxxx.up.railway.app`.

## B5. Verify

1. **Deployments** -> latest -> **View Logs**. You want gunicorn booting workers and no
   traceback. The migration runs on boot, so the first start is a few seconds slower.
2. Open the URL. The login page should load with the SAWiE branding and fonts.
3. Register an account. If the OTP email arrives, Brevo is wired correctly.
4. Save a calculation, then check Supabase **Table Editor -> calculations**.

All four pass means you are live.

---

# Part C — After go-live

**Custom domain.** Settings -> Networking -> **Custom Domain** -> e.g.
`carbonlens.sawie.io`. Railway gives a CNAME target to add at your DNS provider; HTTPS
is issued automatically. Nothing in the app changes, and `ALLOWED_ORIGINS` stays empty
because the frontend is served from the same origin.

**Costs.** Railway's trial credit runs out; the Hobby plan is $5/month and covers this
comfortably. Supabase free gives 500 MB, which is a lot of farm records.

**Supabase free projects pause after 7 days of no activity.** `pool_pre_ping=True` is
already set in `backend/database.py`, so the app reconnects once the project wakes, but
the first request after a pause fails. For anything customer-facing, use Supabase Pro
or keep traffic flowing.

**Backups.** Free Supabase projects get none. Take your own:

```bash
pg_dump "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require" > carbonlens-$(date +%F).sql
```

**Updates.** `git push` to `main`; Railway rebuilds and redeploys. Schema changes are
applied by `backend/migrate.py` on each boot.

**Password rotation.** Supabase -> Settings -> Database -> Reset password, then update
`DATABASE_URL` in Railway's Variables tab. Never in the repository.

---

# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Health check fails, logs empty | `PORT` set manually | Delete the `PORT` variable |
| `SECRET_KEY is missing or too short` | Key under 32 chars | Regenerate (B3) |
| `could not translate host name "db.xxx.supabase.co"` | Direct IPv6 host used | Switch to Session pooler host |
| `password authentication failed` | Password wrong or `@`/`#` not encoded | Re-encode or reset to alphanumeric |
| App loads but login does nothing | `COOKIE_SECURE=true` over HTTP | Use the `https://` URL only |
| `SSL connection has been closed unexpectedly` | Supabase project paused | Open the Supabase dashboard to wake it |
| Build fine, page blank | `frontend/` not committed | Check it is in the repository |

---

# Existing local data

`backend/instance/carbonlens.db` does not move itself. If it holds accounts or
calculations worth keeping, say so and I will write the SQLite-to-Postgres transfer
script. If it is only test data, start clean on Supabase.
