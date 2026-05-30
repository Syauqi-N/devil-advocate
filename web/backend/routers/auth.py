"""
routers/auth.py — v2 Auth endpoints
- POST /auth/sync-user (internal, X-Internal-Key)
- GET /auth/me (jwt_required)
- POST /auth/logout (jwt_required)
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Session as SessionModel, Subscription, Debate
from schemas import SyncUserRequest, SyncUserResponse, MeResponse, LogoutResponse
from config import MAX_DEBATES_FREE, NEXTAUTH_SECRET

router = APIRouter(prefix="/auth", tags=["auth"])

INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _verify_internal_key(x_internal_key: str = Header(alias="X-Internal-Key", default="")):
    """Validate X-Internal-Key header for internal endpoints."""
    if not INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: INTERNAL_API_KEY not set",
        )
    if x_internal_key != INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal key",
        )


async def _get_debates_today(db: AsyncSession, user_id: str) -> int:
    """Count debates created today (UTC) by user."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(Debate.id)).where(
            Debate.user_id == user_id,
            Debate.created_at >= today_start,
        )
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# JWT dependency (reuse from auth/middleware.py)
# ---------------------------------------------------------------------------

async def _jwt_required(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """
    Decode JWT from cookie, validate user exists in PostgreSQL.
    Returns dict with user info.
    """
    from jose import JWTError, jwt as jose_jwt

    token = (
        request.cookies.get("next-auth.session-token")
        or request.cookies.get("__Secure-next-auth.session-token")
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not NEXTAUTH_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: NEXTAUTH_SECRET not set",
        )

    try:
        payload = jose_jwt.decode(token, NEXTAUTH_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub claim",
        )

    # Lookup user by google_id (sub in NextAuth JWT = google_id)
    result = await db.execute(
        select(User).where(User.google_id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return {
        "id": user.id,
        "google_id": user.google_id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "is_pro": user.is_pro,
        "_db": db,
        "_token": token,
    }


# ---------------------------------------------------------------------------
# POST /auth/sync-user
# ---------------------------------------------------------------------------

@router.post("/sync-user", response_model=SyncUserResponse)
async def sync_user(
    payload: SyncUserRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_internal_key),
):
    """
    Internal endpoint — called by Next.js after successful OAuth.
    Upserts user in PostgreSQL, creates a session record.
    """
    # Check if user exists
    result = await db.execute(
        select(User).where(User.google_id == payload.google_id)
    )
    user = result.scalar_one_or_none()
    is_new = False

    if user is None:
        user = User(
            id=str(uuid.uuid4()),
            google_id=payload.google_id,
            email=payload.email,
            name=payload.name,
            avatar_url=payload.avatar_url,
        )
        db.add(user)
        is_new = True
    else:
        # Update fields
        user.email = payload.email
        user.name = payload.name
        user.avatar_url = payload.avatar_url

    # Create session record
    session_record = SessionModel(
        id=str(uuid.uuid4()),
        user_id=user.id if not is_new else user.id,
        token=str(uuid.uuid4()),  # placeholder — real token is in cookie
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(session_record)

    await db.commit()
    await db.refresh(user)

    return SyncUserResponse(id=user.id, is_new=is_new)


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=MeResponse)
async def get_me(user_data: dict = Depends(_jwt_required)):
    """Return current user profile from JWT cookie."""
    db: AsyncSession = user_data["_db"]
    user_id = user_data["id"]

    # Get active subscription
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == "active",
        ).order_by(Subscription.created_at.desc()).limit(1)
    )
    subscription = sub_result.scalar_one_or_none()

    # Count debates today
    debates_today = await _get_debates_today(db, user_id)

    return MeResponse(
        id=user_data["id"],
        email=user_data["email"],
        name=user_data["name"],
        avatar_url=user_data["avatar_url"],
        is_pro=user_data["is_pro"],
        subscription=subscription.plan if subscription else None,
        debates_today=debates_today,
        debates_limit=MAX_DEBATES_FREE if not user_data["is_pro"] else 999,
    )


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@router.post("/logout", response_model=LogoutResponse)
async def logout(user_data: dict = Depends(_jwt_required)):
    """Revoke current session in DB."""
    db: AsyncSession = user_data["_db"]
    token = user_data["_token"]

    # Find session by token and revoke
    result = await db.execute(
        select(SessionModel).where(
            SessionModel.user_id == user_data["id"],
            SessionModel.revoked == False,
        ).order_by(SessionModel.created_at.desc()).limit(1)
    )
    session = result.scalar_one_or_none()

    if session:
        session.revoked = True
        await db.commit()

    return LogoutResponse(ok=True)
