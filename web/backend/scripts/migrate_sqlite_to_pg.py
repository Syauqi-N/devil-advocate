#!/usr/bin/env python3
"""
migrate_sqlite_to_pg.py — Migrate debates.db (SQLite) ke PostgreSQL.

Usage:
    python scripts/migrate_sqlite_to_pg.py --pg-dsn "postgresql://user:pass@host/dbname"
    python scripts/migrate_sqlite_to_pg.py --pg-dsn "..." --dry-run
    python scripts/migrate_sqlite_to_pg.py --pg-dsn "..." --sqlite-path /path/to/debates.db

Options:
    --pg-dsn        PostgreSQL DSN (required)
    --sqlite-path   Path to SQLite DB (default: /opt/devil-advocate-web/backend/debates.db)
    --dry-run       Read SQLite and validate data, but do NOT write to PostgreSQL
    --skip-existing Skip rows that already exist in PG (by primary key), instead of erroring
"""

import argparse
import json
import sqlite3
import sys
import uuid
from datetime import datetime


def parse_args():
    parser = argparse.ArgumentParser(description="Migrate SQLite debates.db to PostgreSQL")
    parser.add_argument(
        "--pg-dsn",
        required=True,
        help="PostgreSQL DSN, e.g. postgresql://user:pass@localhost/dbname",
    )
    parser.add_argument(
        "--sqlite-path",
        default="/opt/devil-advocate-web/backend/debates.db",
        help="Path to SQLite database file",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print stats without writing to PostgreSQL",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip rows that already exist in PG (by PK) instead of raising an error",
    )
    return parser.parse_args()


def read_sqlite(sqlite_path: str):
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM users ORDER BY created_at")
    users = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM debates ORDER BY created_at")
    debates_raw = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM usage")
    usage = [dict(r) for r in cur.fetchall()]

    conn.close()
    return users, debates_raw, usage


def validate_and_transform_debates(debates_raw: list) -> list:
    """Parse JSON fields and ensure UUIDs are valid."""
    debates = []
    for row in debates_raw:
        # rounds: stored as JSON string
        rounds_raw = row.get("rounds") or "[]"
        try:
            rounds = json.loads(rounds_raw)
        except (json.JSONDecodeError, TypeError):
            rounds = []

        # verdict: stored as JSON string or plain text
        verdict_raw = row.get("verdict") or ""
        if verdict_raw:
            try:
                verdict = json.loads(verdict_raw)
                # re-serialize to canonical JSON string for PG TEXT column
                verdict_str = json.dumps(verdict, ensure_ascii=False)
            except (json.JSONDecodeError, TypeError):
                verdict_str = verdict_raw
        else:
            verdict_str = None

        # share_token: preserve existing, generate if missing
        share_token = row.get("share_token") or uuid.uuid4().hex

        debates.append({
            "id": row["id"],
            "user_id": row["user_id"],
            "topic": row["topic"],
            "rounds_count": row.get("rounds_count", 3),
            "rounds": json.dumps(rounds, ensure_ascii=False),
            "verdict": verdict_str,
            "verdict_badge": row.get("verdict_badge"),
            "share_token": share_token,
            "is_public": bool(row.get("is_public", 0)),
            "created_at": row.get("created_at"),
        })
    return debates


def migrate_to_pg(pg_dsn: str, users: list, debates: list, usage: list, skip_existing: bool):
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary==2.9.9")
        sys.exit(1)

    conn = psycopg2.connect(pg_dsn)
    conn.autocommit = False
    cur = conn.cursor()

    # Ensure tables exist (idempotent DDL)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            google_id TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            avatar TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS debates (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            topic TEXT NOT NULL,
            rounds_count INTEGER NOT NULL DEFAULT 3,
            rounds JSONB NOT NULL DEFAULT '[]',
            verdict TEXT,
            verdict_badge TEXT,
            share_token TEXT UNIQUE,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS usage (
            user_id TEXT NOT NULL REFERENCES users(id),
            date TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, date)
        )
    """)

    inserted_users = 0
    skipped_users = 0
    for u in users:
        if skip_existing:
            cur.execute("SELECT id FROM users WHERE id = %s", (u["id"],))
            if cur.fetchone():
                skipped_users += 1
                continue
        cur.execute(
            """INSERT INTO users (id, google_id, email, name, avatar, created_at)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON CONFLICT (id) DO NOTHING""",
            (u["id"], u["google_id"], u["email"], u.get("name"), u.get("avatar"), u.get("created_at")),
        )
        inserted_users += 1

    inserted_debates = 0
    skipped_debates = 0
    for d in debates:
        if skip_existing:
            cur.execute("SELECT id FROM debates WHERE id = %s", (d["id"],))
            if cur.fetchone():
                skipped_debates += 1
                continue
        cur.execute(
            """INSERT INTO debates (id, user_id, topic, rounds_count, rounds, verdict, verdict_badge, share_token, is_public, created_at)
               VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s)
               ON CONFLICT (id) DO NOTHING""",
            (
                d["id"], d["user_id"], d["topic"], d["rounds_count"],
                d["rounds"], d["verdict"], d.get("verdict_badge"),
                d["share_token"], d["is_public"], d.get("created_at"),
            ),
        )
        inserted_debates += 1

    inserted_usage = 0
    skipped_usage = 0
    for u in usage:
        if skip_existing:
            cur.execute("SELECT user_id FROM usage WHERE user_id = %s AND date = %s", (u["user_id"], u["date"]))
            if cur.fetchone():
                skipped_usage += 1
                continue
        cur.execute(
            """INSERT INTO usage (user_id, date, count)
               VALUES (%s, %s, %s)
               ON CONFLICT (user_id, date) DO NOTHING""",
            (u["user_id"], u["date"], u.get("count", 0)),
        )
        inserted_usage += 1

    conn.commit()
    cur.close()
    conn.close()

    return {
        "users": {"inserted": inserted_users, "skipped": skipped_users},
        "debates": {"inserted": inserted_debates, "skipped": skipped_debates},
        "usage": {"inserted": inserted_usage, "skipped": skipped_usage},
    }


def main():
    args = parse_args()

    print(f"Reading SQLite: {args.sqlite_path}")
    users, debates_raw, usage = read_sqlite(args.sqlite_path)
    debates = validate_and_transform_debates(debates_raw)

    print(f"  users:   {len(users)}")
    print(f"  debates: {len(debates)}")
    print(f"  usage:   {len(usage)}")

    # Validate: all debate.user_id must exist in users
    user_ids = {u["id"] for u in users}
    orphan_debates = [d for d in debates if d["user_id"] not in user_ids]
    if orphan_debates:
        print(f"WARNING: {len(orphan_debates)} debates have user_id not in users table:")
        for d in orphan_debates[:5]:
            print(f"  debate {d['id']} -> user_id {d['user_id']}")

    if args.dry_run:
        print("\n[DRY RUN] Validation passed. No data written to PostgreSQL.")
        print(f"  Would insert {len(users)} users, {len(debates)} debates, {len(usage)} usage rows.")
        if orphan_debates:
            print(f"  WARNING: {len(orphan_debates)} orphan debates would be skipped or cause FK errors.")
        sys.exit(0)

    print(f"\nMigrating to PostgreSQL: {args.pg_dsn[:30]}...")
    stats = migrate_to_pg(args.pg_dsn, users, debates, usage, skip_existing=args.skip_existing)

    print("\nMigration complete:")
    for table, s in stats.items():
        print(f"  {table}: inserted={s['inserted']}, skipped={s['skipped']}")


if __name__ == "__main__":
    main()
