# Changes in this version (November 2026)

## Fixed: logic and errors
- Saved history stored **empty** fertiliser, machinery and crop-protection data (wrong fields were read). Every input is now saved in full.
- Fertiliser step "Back" button jumped to Farm registration instead of Seed.
- A hidden "tehsil" field blocked the calculation for farms outside Pakistan.
- Switching country away from Pakistan and back broke the province/district lists.
- Two users with the same Farm ID caused a server error on save.
- Starting a new calculation kept the old step progress unlocked.
- Mandatory field markers (*) were hidden by CSS; field help text was never shown.
- PDF report showed a box instead of "CO₂"; the Word report crashed on empty fields.
- Assistant sent the latest message twice; the error bar also fired for browser-extension errors.
- Removed unused code (sample preview charts, dark mode stub, 100 KB embedded logo).
- The calculation engine (`computeAll`) and all emission factors are **unchanged**.

## Security
- New session system: 15-minute access token + rotating refresh token (HttpOnly cookies), automatic renewal, theft detection, "keep me signed in" for 30 days.
- Changing or resetting a password signs out all other devices.
- Rate limits, account lock after 5 wrong passwords, one-time codes limited to 5 tries and stored hashed in the database.
- CSRF protection, Content-Security-Policy and other security headers.
- Contact emails and history no longer allow HTML/script injection.
- Assistant requires sign-in (protects the Groq quota).
- Report downloads are tied to the user who created them.
- API keys removed from `.env.example`; a strong `SECRET_KEY` is generated.

## Design and layout
- "Book a demo" removed everywhere; "Talk to us" is the green main button.
- About/Contact headers rebuilt as a contained card (no more shapes spilling off the page); breadcrumbs ("Home / Contact") removed.
- "Open the calculator" section: spacing and alignment fixed.
- Sign-in page left panel rewritten around the real methodology.
- Weather: animated lines removed; live weather is detected on page open and refreshes every 10 minutes.
- News images are cached and served by the backend, with a branded placeholder if an article has no image.
- Calmer, professional motion; consistent spacing; themed calculator with a step bar on phones.
- Checked at 360, 390, 768, 820, 1024, 1366, 1440 and 1920 px: no horizontal scrolling, no overlapping text.
- Profile history: view breakdown per calculation, delete one, or clear all with an email code.

## Project
- Split into `frontend/` and `backend/`, with `run.bat` / `run.sh`, `requirements.txt`, `README.md`, automated tests and `wsgi.py` for deployment.
- Email updated to **sawie.info@gmail.com** everywhere.
