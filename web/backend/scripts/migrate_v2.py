#!/usr/bin/env python3
"""
migrate_v2.py — Migrate SQLite (v1 schema) ke PostgreSQL (v2 schema).

Transformasi:
- users: id TEXT(UUID) → UUID, tambah is_pro=false, avatar_url dari avatar, updated_at=created_at
- debates: id "DA-xxx" → UUID baru, rounds JSON → debate_rounds rows
- usage: skip (tidak ada di v2 schema)
- verdict/verdict_badge: skip (tidak ada di v2 schema)

Usage:
    python scripts/migrate_v2.py --pg-dsn "postgresql://..." [--sqlite-path debates.db] [--dry-run]
"""

import argparse
import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pg-dsn", required=True)
    parser.add_argument("--sqlite-path", default="/opt/devil-advocate-web/backend/debates.db")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    return parser.parse_args()


def read_sqlite(sqlite_path):
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM users ORDER BY created_at")
    users = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM debates ORDER BY created_at")
    debates = [dict(r) for r in cur.fetchall()]

    conn.close()
    return users, debates


def parse_ts(ts_str):
    """Parse SQLite timestamp string to timezone-aware datetime."""
    if not ts_str:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def transform_users(users):
    result = []
    for u in users:
        result.append({
            "id": u["id"],  # already UUID string
            "google_id": u["google_id"],
            "email": u["email"],
            "name": u.get("name") or u["email"].split("@")[0],
            "avatar_url": u.get("avatar"),
            "is_pro": False,
            "created_at": parse_ts(u.get("created_at")),
            "updated_at": parse_ts(u.get("created_at")),
        })
    return result


def transform_debates(debates):
    """Returns (debates_rows, rounds_rows)."""
    debate_rows = []
    round_rows = []

    for d in debates:
        new_debate_id = str(uuid.uuid4())
        share_token = d.get("share_token") or uuid.uuid4().hex
        created_at = parse_ts(d.get("created_at"))

        debate_rows.append({
            "id": new_debate_id,
            "user_id": d["user_id"],
            "topic": d["topic"],
            "rounds_count": d.get("rounds_count", 3),
            "share_token": share_token,
            "persona_id": None,
            "template_id": None,
            "created_at": created_at,
            # store old id for reference
            "_old_id": d["id"],
        })

        # Parse rounds JSON
        rounds_raw = d.get("rounds") or "[]"
        try:
            rounds = json.loads(rounds_raw)
        except Exception:
            rounds = []

        for i, r in enumerate(rounds):
            round_num = r.get("round", i + 1)
            advocate_arg = r.get("advocate") or r.get("advocate_argument") or ""
            devil_arg = r.get("devil") or r.get("devil_argument") or r.get("counter") or ""

            round_rows.append({
                "id": str(uuid.uuid4()),
                "debate_id": new_debate_id,
                "round_number": round_num,
                "advocate_argument": advocate_arg,
                "devil_argument": devil_arg,
                "created_at": created_at,
            })

    return debate_rows, round_rows


def migrate(pg_dsn, users, debate_rows, round_rows, skip_existing, dry_run):
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("ERROR: psycopg2 not installed.")
        sys.exit(1)

    if dry_run:
        print("\n[DRY RUN] Would insert:")
        print(f"  {len(users)} users")
        print(f"  {len(debate_rows)} debates")
        print(f"  {len(round_rows)} debate_rounds")
        return

    conn = psycopg2.connect(pg_dsn, client_encoding="UTF8")
    conn.autocommit = False
    cur = conn.cursor()

    # Insert users
    inserted_users = 0
    skipped_users = 0
    for u in users:
        if skip_existing:
            cur.execute("SELECT id FROM users WHERE id = %s::uuid OR email = %s OR google_id = %s",
                        (u["id"], u["email"], u["google_id"]))
            if cur.fetchone():
                skipped_users += 1
                continue
        cur.execute("""
            INSERT INTO users (id, google_id, email, name, avatar_url, is_pro, created_at, updated_at)
            VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            u["id"], u["google_id"], u["email"], u["name"],
            u["avatar_url"], u["is_pro"], u["created_at"], u["updated_at"]
        ))
        inserted_users += 1

    # Insert debates
    inserted_debates = 0
    skipped_debates = 0
    for d in debate_rows:
        cur.execute("""
            INSERT INTO debates (id, user_id, topic, rounds_count, share_token, persona_id, template_id, created_at)
            VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            d["id"], d["user_id"], d["topic"], d["rounds_count"],
            d["share_token"], d["persona_id"], d["template_id"], d["created_at"]
        ))
        inserted_debates += 1

    # Insert debate_rounds
    inserted_rounds = 0
    for r in round_rows:
        cur.execute("""
            INSERT INTO debate_rounds (id, debate_id, round_number, advocate_argument, devil_argument, created_at)
            VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s)
            ON CONFLICT (debate_id, round_number) DO NOTHING
        """, (
            r["id"], r["debate_id"], r["round_number"],
            r["advocate_argument"], r["devil_argument"], r["created_at"]
        ))
        inserted_rounds += 1

    conn.commit()
    cur.close()
    conn.close()

    print("\nMigration complete:")
    print(f"  users:         inserted={inserted_users}, skipped={skipped_users}")
    print(f"  debates:       inserted={inserted_debates}, skipped={skipped_debates}")
    print(f"  debate_rounds: inserted={inserted_rounds}")


def main():
    args = parse_args()

    print(f"Reading SQLite: {args.sqlite_path}")
    users_raw, debates_raw = read_sqlite(args.sqlite_path)
    print(f"  users:   {len(users_raw)}")
    print(f"  debates: {len(debates_raw)}")

    users = transform_users(users_raw)
    debate_rows, round_rows = transform_debates(debates_raw)

    print(f"  debate_rounds to generate: {len(round_rows)}")

    # Validate FK: all debate.user_id must exist in users
    user_ids = {u["id"] for u in users}
    orphans = [d for d in debate_rows if d["user_id"] not in user_ids]
    if orphans:
        print(f"WARNING: {len(orphans)} debates have unknown user_id — will fail FK constraint")
        for d in orphans[:5]:
            print(f"  debate {d['_old_id']} -> user_id {d['user_id']}")

    migrate(args.pg_dsn, users, debate_rows, round_rows, args.skip_existing, args.dry_run)


if __name__ == "__main__":
    main()
