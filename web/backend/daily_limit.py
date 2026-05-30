"""
Daily limit — enforce 1 debat/hari per user (freemium).
"""

import os
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models import User, Usage

DAILY_LIMIT = int(os.getenv("DAILY_DEBATE_LIMIT", "1"))


def _get_today_usage(user: User, db: Session) -> Usage:
    today = date.today()
    usage = (
        db.query(Usage)
        .filter(Usage.user_id == user.id, Usage.date == today)
        .first()
    )
    if usage is None:
        usage = Usage(user_id=user.id, date=today, count=0)
        db.add(usage)
        db.flush()
    return usage


def check_daily_limit(user: User, db: Session) -> None:
    """Raise HTTP 429 jika user sudah >= DAILY_LIMIT debat hari ini."""
    usage = _get_today_usage(user, db)
    if usage.count >= DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "daily_limit_exceeded",
                "message": f"Batas {DAILY_LIMIT} debat per hari sudah tercapai. Coba lagi besok.",
                "limit": DAILY_LIMIT,
                "used": usage.count,
                "remaining": 0,
            },
        )


def increment_usage(user: User, db: Session) -> Usage:
    """Increment counter setelah debat berhasil dibuat."""
    usage = _get_today_usage(user, db)
    usage.count += 1
    db.commit()
    db.refresh(usage)
    return usage


def get_usage(user: User, db: Session) -> dict:
    """Return usage info untuk user hari ini."""
    usage = _get_today_usage(user, db)
    return {
        "used_today": usage.count,
        "limit": DAILY_LIMIT,
        "remaining": max(0, DAILY_LIMIT - usage.count),
        "date": usage.date,
    }
