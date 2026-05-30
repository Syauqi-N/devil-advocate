"""
JWT auth middleware untuk Devil's Advocate v2.

Baca cookie next-auth.session-token, decode JWT dengan NEXTAUTH_SECRET (HS256),
query tabel users via SQLAlchemy async untuk validasi.
"""
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import NEXTAUTH_SECRET
from database import get_db


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _decode_token(token: str) -> dict:
    """Decode dan validasi JWT. Raise 401 jika invalid/expired."""
    if not NEXTAUTH_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: NEXTAUTH_SECRET not set",
        )
    try:
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def _get_user_from_db(user_id: str, db: AsyncSession) -> Optional[dict]:
    """Query tabel users by google_id (sub claim). Return dict atau None."""
    from models import User
    result = await db.execute(
        select(User).where(User.google_id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return None
    return {
        "id": user.id,
        "google_id": user.google_id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "is_pro": user.is_pro,
    }


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """
    Dependency: return user dict jika JWT valid dan user ada di DB.
    Raise 401 jika token tidak ada, invalid, expired, atau user tidak ditemukan.

    Mendukung dua sumber auth (backward-compatible):
    1. Cookie next-auth.session-token (JWT, v2)
    2. X-User-Id / X-User-Email headers (legacy v1)
    """
    # --- v2: cookie JWT ---
    token = request.cookies.get("next-auth.session-token") or \
            request.cookies.get("__Secure-next-auth.session-token")

    if token:
        payload = _decode_token(token)  # raise 401 jika invalid
        user_id: str = payload.get("sub", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing sub claim",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = await _get_user_from_db(user_id, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    # --- v1 fallback: X-User-Id headers ---
    x_user_id = request.headers.get("x-user-id")
    x_user_email = request.headers.get("x-user-email")
    x_user_name = request.headers.get("x-user-name")
    x_user_avatar = request.headers.get("x-user-avatar")

    if x_user_id and x_user_email:
        # Upsert user via v1 headers
        from models import User
        import uuid

        result = await db.execute(
            select(User).where(User.google_id == x_user_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                id=str(uuid.uuid4()),
                google_id=x_user_id,
                email=x_user_email,
                name=x_user_name or "",
                avatar_url=x_user_avatar,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            user.email = x_user_email
            user.name = x_user_name or user.name
            user.avatar_url = x_user_avatar or user.avatar_url
            await db.commit()
            await db.refresh(user)

        return {
            "id": user.id,
            "google_id": user.google_id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "is_pro": user.is_pro,
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_pro_user(user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency: return user dict hanya jika user adalah Pro.
    Raise 403 jika bukan Pro.
    """
    is_pro = user.get("is_pro", False)
    if isinstance(is_pro, int):
        is_pro = bool(is_pro)
    if not is_pro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro subscription required",
        )
    return user
