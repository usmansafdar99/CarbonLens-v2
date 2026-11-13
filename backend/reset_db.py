"""Empty the local database (all users, logins and history). A backup copy is kept first.
Run from the backend folder:  python reset_db.py"""
import shutil, sys, time
from pathlib import Path
import config
if not config.DATABASE_URL.startswith("sqlite"):
    sys.exit("This only resets the local SQLite database. It will not touch PostgreSQL.")
db = Path(config.DATABASE_URL.replace("sqlite:///", ""))
if input(f"Delete ALL data in {db.name}? Type YES: ").strip() != "YES":
    sys.exit("Cancelled.")
if db.exists():
    backup = db.with_name(f"backup-{time.strftime('%Y%m%d-%H%M%S')}-{db.name}")
    shutil.copy2(db, backup); print("Backup saved:", backup.name)
    for f in db.parent.glob(db.name + "*"):
        f.unlink()
import migrate
migrate.run_migrations()
print("Done. The database is empty; create a new account with Sign up.")
