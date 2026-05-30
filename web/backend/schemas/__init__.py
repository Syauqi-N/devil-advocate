from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class UserCreate(BaseModel):
    google_id: str
    email: str
    name: str
    avatar: Optional[str] = None


class UserOut(BaseModel):
    id: str
    google_id: str
    email: str
    name: str
    avatar: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class SessionUpsertRequest(BaseModel):
    google_id: str
    email: str
    name: str
    avatar: Optional[str] = None


class SessionUpsertResponse(BaseModel):
    user_id: str
    email: str
    name: str
    is_new: bool


# --- Auth v2 schemas ---

class SyncUserRequest(BaseModel):
    """POST /auth/sync-user — internal call from Next.js after OAuth."""
    google_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None


class SyncUserResponse(BaseModel):
    id: str
    is_new: bool


class MeResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str]
    is_pro: bool
    subscription: Optional[str] = None  # plan name or null
    debates_today: int
    debates_limit: int
    model_config = {"from_attributes": True}


class LogoutResponse(BaseModel):
    ok: bool


# --- Debate schemas ---

class DebateCreate(BaseModel):
    topic: str
    rounds_count: int = 3


class RoundOut(BaseModel):
    advocate: str
    devil: str


class DebateOut(BaseModel):
    id: str
    user_id: str
    topic: str
    rounds_count: int
    rounds: Optional[list[RoundOut]]
    verdict: Optional[str]
    verdict_badge: Optional[str]
    is_public: bool
    share_token: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class DebateSummary(BaseModel):
    id: str
    topic: str
    rounds_count: int
    verdict_badge: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class UsageOut(BaseModel):
    used_today: int
    limit: int
    remaining: int
    date: date
