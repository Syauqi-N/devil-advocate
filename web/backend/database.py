"""
database.py — v2
SQLAlchemy async engine + Base untuk PostgreSQL.
Includes legacy-compatible helper functions used by main.py.
"""
import json
import os
import uuid
from datetime import date, datetime, timezone

from dotenv import load_dotenv
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

load_dotenv()


class Base(DeclarativeBase):
    pass


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL not set in environment")
    return url


def get_async_database_url() -> str:
    """Convert postgres:// or postgresql:// to postgresql+asyncpg://"""
    url = get_database_url()
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# Engine & session factory — initialized lazily via init_db()
engine = None
AsyncSessionLocal = None


async def init_db():
    global engine, AsyncSessionLocal
    async_url = get_async_database_url()
    engine = create_async_engine(async_url, echo=False, pool_pre_ping=True)
    AsyncSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session."""
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    async with AsyncSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Helper: session context manager for one-shot queries
# ---------------------------------------------------------------------------

def _session():
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return AsyncSessionLocal()


def _today() -> str:
    return date.today().isoformat()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# User helpers
# ---------------------------------------------------------------------------

async def get_or_create_user(
    google_id: str,
    email: str,
    name: str | None = None,
    avatar: str | None = None,
) -> dict:
    async with _session() as db:
        result = await db.execute(
            text("SELECT id, google_id, email, name, avatar_url FROM users WHERE google_id = :gid"),
            {"gid": google_id},
        )
        row = result.mappings().fetchone()
        if row:
            # Update mutable fields
            await db.execute(
                text(
                    "UPDATE users SET email=:email, name=:name, avatar_url=:avatar "
                    "WHERE google_id=:gid"
                ),
                {"email": email, "name": name, "avatar": avatar, "gid": google_id},
            )
            await db.commit()
            return {
                "id": row["id"],
                "google_id": row["google_id"],
                "email": row["email"],
                "name": row["name"],
            }
        user_id = str(uuid.uuid4())
        await db.execute(
            text(
                "INSERT INTO users (id, google_id, email, name, avatar_url) "
                "VALUES (:id, :gid, :email, :name, :avatar)"
            ),
            {"id": user_id, "gid": google_id, "email": email, "name": name or "", "avatar": avatar},
        )
        await db.commit()
        return {"id": user_id, "google_id": google_id, "email": email, "name": name or ""}


# ---------------------------------------------------------------------------
# Usage helpers
# ---------------------------------------------------------------------------

async def get_usage_today(user_id: str) -> int:
    async with _session() as db:
        result = await db.execute(
            text("SELECT count FROM usage WHERE user_id=:uid AND date=:d"),
            {"uid": user_id, "d": _today()},
        )
        row = result.fetchone()
        return row[0] if row else 0


async def check_and_increment_usage(user_id: str, limit: int) -> bool:
    async with _session() as db:
        result = await db.execute(
            text("SELECT count FROM usage WHERE user_id=:uid AND date=:d"),
            {"uid": user_id, "d": _today()},
        )
        row = result.fetchone()
        current = row[0] if row else 0
        if current >= limit:
            return False
        if row:
            await db.execute(
                text("UPDATE usage SET count=count+1 WHERE user_id=:uid AND date=:d"),
                {"uid": user_id, "d": _today()},
            )
        else:
            await db.execute(
                text(
                    "INSERT INTO usage (user_id, date, count) VALUES (:uid, :d, 1) "
                    "ON CONFLICT (user_id, date) DO UPDATE SET count=usage.count+1"
                ),
                {"uid": user_id, "d": _today()},
            )
        await db.commit()
        return True


# ---------------------------------------------------------------------------
# Debate helpers
# ---------------------------------------------------------------------------

def _rows_to_debate(debate_row, round_rows) -> dict:
    """Convert DB rows to the dict shape expected by DebateResponse."""
    rounds = [
        {
            "round": r["round_number"],
            "advocate": r["advocate_argument"],
            "devil": r["devil_argument"],
        }
        for r in sorted(round_rows, key=lambda x: x["round_number"])
    ]

    verdict_raw = debate_row["verdict"]
    verdict = None
    if verdict_raw:
        try:
            verdict = json.loads(verdict_raw)
        except (json.JSONDecodeError, TypeError):
            verdict = {"summary": verdict_raw, "risks": [], "opportunities": [], "verdict": "LANJUT", "action_items": []}

    created_at = debate_row["created_at"]
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()

    return {
        "id": str(debate_row["id"]),
        "user_id": str(debate_row["user_id"]),
        "topic": debate_row["topic"],
        "rounds_count": debate_row["rounds_count"],
        "rounds": rounds,
        "verdict": verdict,
        "share_token": debate_row["share_token"],
        "created_at": created_at,
    }


async def reserve_debate_id(user_id: str, topic: str, rounds_count: int) -> dict:
    """Insert a placeholder debate row and return its id + share_token."""
    debate_id = str(uuid.uuid4())
    share_token = uuid.uuid4().hex
    async with _session() as db:
        await db.execute(
            text(
                "INSERT INTO debates (id, user_id, topic, rounds_count, share_token) "
                "VALUES (:id, :uid, :topic, :rc, :st)"
            ),
            {"id": debate_id, "uid": user_id, "topic": topic, "rc": rounds_count, "st": share_token},
        )
        await db.commit()
    return {"id": debate_id, "share_token": share_token}


async def update_debate(debate_id: str, rounds: list, verdict) -> None:
    """Persist rounds + verdict after streaming completes."""
    verdict_str = None
    if verdict:
        if isinstance(verdict, str):
            verdict_str = verdict
        else:
            verdict_str = json.dumps(verdict, ensure_ascii=False)

    async with _session() as db:
        # Upsert rounds into debate_rounds table
        for r in rounds:
            await db.execute(
                text(
                    "INSERT INTO debate_rounds (id, debate_id, round_number, advocate_argument, devil_argument) "
                    "VALUES (:id, :did, :rn, :adv, :dev) "
                    "ON CONFLICT (debate_id, round_number) DO UPDATE "
                    "SET advocate_argument=EXCLUDED.advocate_argument, devil_argument=EXCLUDED.devil_argument"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "did": debate_id,
                    "rn": r["round"],
                    "adv": r["advocate"],
                    "dev": r["devil"],
                },
            )
        await db.execute(
            text("UPDATE debates SET verdict=:v WHERE id=:id"),
            {"v": verdict_str, "id": debate_id},
        )
        await db.commit()


async def save_debate(user_id: str, topic: str, rounds_count: int, rounds: list, verdict) -> dict:
    """Create a complete debate in one shot (non-streaming path)."""
    reserved = await reserve_debate_id(user_id, topic, rounds_count)
    await update_debate(reserved["id"], rounds, verdict)
    return reserved


async def get_debate(debate_id: str) -> dict | None:
    async with _session() as db:
        result = await db.execute(
            text("SELECT id, user_id, topic, rounds_count, verdict, share_token, created_at FROM debates WHERE id=:id"),
            {"id": debate_id},
        )
        row = result.mappings().fetchone()
        if not row:
            return None
        rounds_result = await db.execute(
            text("SELECT round_number, advocate_argument, devil_argument FROM debate_rounds WHERE debate_id=:did ORDER BY round_number"),
            {"did": debate_id},
        )
        round_rows = rounds_result.mappings().fetchall()
    return _rows_to_debate(row, round_rows)


async def get_debate_by_share_token(share_token: str) -> dict | None:
    async with _session() as db:
        result = await db.execute(
            text("SELECT id, user_id, topic, rounds_count, verdict, share_token, created_at FROM debates WHERE share_token=:st"),
            {"st": share_token},
        )
        row = result.mappings().fetchone()
        if not row:
            return None
        rounds_result = await db.execute(
            text("SELECT round_number, advocate_argument, devil_argument FROM debate_rounds WHERE debate_id=:did ORDER BY round_number"),
            {"did": row["id"]},
        )
        round_rows = rounds_result.mappings().fetchall()
    return _rows_to_debate(row, round_rows)


async def get_debates_paginated(user_id: str, page: int, limit: int, offset: int) -> tuple[list, int]:
    async with _session() as db:
        count_result = await db.execute(
            text("SELECT COUNT(*) FROM debates WHERE user_id=:uid"),
            {"uid": user_id},
        )
        total = count_result.scalar()

        result = await db.execute(
            text(
                "SELECT id, user_id, topic, rounds_count, verdict, share_token, created_at "
                "FROM debates WHERE user_id=:uid ORDER BY created_at DESC LIMIT :lim OFFSET :off"
            ),
            {"uid": user_id, "lim": limit, "off": offset},
        )
        rows = result.mappings().fetchall()

        debates = []
        for row in rows:
            rounds_result = await db.execute(
                text("SELECT round_number, advocate_argument, devil_argument FROM debate_rounds WHERE debate_id=:did ORDER BY round_number"),
                {"did": row["id"]},
            )
            round_rows = rounds_result.mappings().fetchall()
            debates.append(_rows_to_debate(row, round_rows))

    return debates, total


async def get_history(user_id: str) -> list:
    async with _session() as db:
        result = await db.execute(
            text(
                "SELECT id, topic, rounds_count, created_at FROM debates "
                "WHERE user_id=:uid ORDER BY created_at DESC LIMIT 50"
            ),
            {"uid": user_id},
        )
        rows = result.mappings().fetchall()
    items = []
    for row in rows:
        created_at = row["created_at"]
        if hasattr(created_at, "isoformat"):
            created_at = created_at.isoformat()
        items.append({
            "id": str(row["id"]),
            "topic": row["topic"],
            "rounds_count": row["rounds_count"],
            "created_at": created_at,
        })
    return items
