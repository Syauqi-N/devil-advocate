"""
schemas.py — Pydantic request/response models untuk Devil's Advocate v2.
"""
from typing import Optional

from pydantic import BaseModel, EmailStr


# ---------------------------------------------------------------------------
# Auth — sync-user
# ---------------------------------------------------------------------------

class SyncUserRequest(BaseModel):
    google_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None


class SyncUserResponse(BaseModel):
    id: str
    is_new: bool


# ---------------------------------------------------------------------------
# Auth — me
# ---------------------------------------------------------------------------

class MeResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    is_pro: bool
    subscription: Optional[str] = None  # plan name or None
    debates_today: int
    debates_limit: int


# ---------------------------------------------------------------------------
# Auth — logout
# ---------------------------------------------------------------------------

class LogoutResponse(BaseModel):
    ok: bool
