"""Create tables and bring an older database up to the current schema.

Safe to run on every start: each step checks before it changes anything.
Handles the SQLite file from earlier versions and a fresh PostgreSQL database alike.
"""
import logging

from sqlalchemy import inspect, text

import models  # noqa: F401  (registers every model on Base)
from database import Base, engine

log = logging.getLogger("carbonlens.migrate")

# table -> {column: DDL type + default}
_NEW_COLUMNS = {
    "users": {
        "token_version": "INTEGER NOT NULL DEFAULT 0",
        "failed_logins": "INTEGER NOT NULL DEFAULT 0",
        "locked_until": "TIMESTAMP NULL",
        "last_login_at": "TIMESTAMP NULL",
    },
    "calculations": {
        "country": "VARCHAR(100) DEFAULT ''",
        "results": "JSON",
    },
}


def run_migrations() -> None:
    Base.metadata.create_all(bind=engine)
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, cols in _NEW_COLUMNS.items():
            if not insp.has_table(table):
                continue
            existing = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                    log.info("migrate: added %s.%s", table, name)

        # Farm IDs used to be unique across ALL users, so two users could not both
        # have "F-001". Make them unique per owner instead.
        if insp.has_table("farms"):
            idx = {i["name"]: i for i in insp.get_indexes("farms")}
            old = idx.get("ix_farms_farm_id")
            if old and old.get("unique"):
                conn.execute(text("DROP INDEX ix_farms_farm_id"))
                conn.execute(text("CREATE INDEX ix_farms_farm_id ON farms (farm_id)"))
                log.info("migrate: farms.farm_id no longer globally unique")
            uniques = {u["name"] for u in insp.get_unique_constraints("farms")}
            if "uq_farm_owner_farmid" not in uniques and "uq_farm_owner_farmid" not in idx:
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_farm_owner_farmid ON farms (owner_id, farm_id)"))
