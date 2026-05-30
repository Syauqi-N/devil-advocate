import json
import uuid
from datetime import date, datetime

import aiosqlite

from config import DB_PATH


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                language TEXT DEFAULT 'auto',
                debates_today INTEGER DEFAULT 0,
                last_reset DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS debates (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                chat_id INTEGER NOT NULL,
                topic TEXT NOT NULL,
                rounds JSON NOT NULL,
                verdict TEXT,
                language TEXT DEFAULT 'auto',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


def _generate_id():
    return f"DA-{uuid.uuid4().hex[:8]}"


async def get_or_create_user(user_id: int, username: str = None):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        user = await cursor.fetchone()
        if not user:
            await db.execute(
                "INSERT INTO users (user_id, username, last_reset) VALUES (?, ?, ?)",
                (user_id, username, date.today().isoformat()),
            )
            await db.commit()
            cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            user = await cursor.fetchone()
        return user


async def check_and_increment_usage(user_id: int, max_debates: int) -> bool:
    """Returns True if user can debate, False if limit reached."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT debates_today, last_reset FROM users WHERE user_id = ?", (user_id,))
        user = await cursor.fetchone()
        if not user:
            return False

        today = date.today().isoformat()
        if user["last_reset"] != today:
            await db.execute(
                "UPDATE users SET debates_today = 1, last_reset = ? WHERE user_id = ?",
                (today, user_id),
            )
            await db.commit()
            return True

        if user["debates_today"] >= max_debates:
            return False

        await db.execute(
            "UPDATE users SET debates_today = debates_today + 1 WHERE user_id = ?",
            (user_id,),
        )
        await db.commit()
        return True


async def save_debate(user_id: int, chat_id: int, topic: str, rounds: list, verdict: str, language: str = "auto"):
    debate_id = _generate_id()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO debates (id, user_id, chat_id, topic, rounds, verdict, language) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (debate_id, user_id, chat_id, topic, json.dumps(rounds), verdict, language),
        )
        await db.commit()
    return debate_id


async def get_debate(debate_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM debates WHERE id = ?", (debate_id,))
        row = await cursor.fetchone()
        if row:
            result = dict(row)
            result["rounds"] = json.loads(result["rounds"])
            return result
        return None


async def get_history(user_id: int, limit: int = 10):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, topic, created_at FROM debates WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        )
        return [dict(row) for row in await cursor.fetchall()]


async def set_user_language(user_id: int, language: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET language = ? WHERE user_id = ?", (language, user_id))
        await db.commit()
