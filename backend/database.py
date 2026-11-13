"""SQLAlchemy engine and session factory. Works with SQLite (local) and PostgreSQL (deployed)."""
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

import config

_is_sqlite = config.DATABASE_URL.startswith("sqlite")

engine = create_engine(
    config.DATABASE_URL,
    pool_pre_ping=True,                       # drop dead connections (free Postgres tiers sleep)
    connect_args={"check_same_thread": False, "timeout": 15} if _is_sqlite else {},
    **({} if _is_sqlite else {"pool_size": 5, "max_overflow": 5, "pool_recycle": 280}),
)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")   # readers don't block the writer
        cur.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base = declarative_base()


@contextmanager
def session_scope():
    """`with session_scope() as db:` commits on success, rolls back on error, always closes."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
