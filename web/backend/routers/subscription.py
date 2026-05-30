"""Pakasir payment integration for Pro subscription."""

import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from config import (
    PAKASIR_PROJECT_SLUG,
    PAKASIR_API_KEY,
    PAKASIR_CALLBACK_URL,
    PAKASIR_SUCCESS_URL,
)
from database import get_db
from models import Subscription, User
from config import MAX_DEBATES_FREE

router = APIRouter(prefix="/subscription", tags=["subscription"])

PRO_AMOUNT = 49000
PRO_DURATION_DAYS = 30


# --- Helpers ---

async def _get_user_active_subscription(db: AsyncSession, user_id: str) -> Subscription | None:
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.plan == "pro",
            Subscription.status == "active",
            Subscription.expires_at > func.now(),
        )
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_pending_subscription(db: AsyncSession, user_id: str) -> Subscription | None:
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.status == "pending",
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_subscription_by_order_id(db: AsyncSession, order_id: str) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(Subscription.order_id == order_id)
    )
    return result.scalar_one_or_none()


async def _update_subscription_paid(db: AsyncSession, sub: Subscription):
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=PRO_DURATION_DAYS)
    sub.status = "active"
    sub.started_at = now
    sub.expires_at = expires
    sub.updated_at = now
    await db.flush()


async def _update_subscription_expired(db: AsyncSession, sub: Subscription):
    now = datetime.now(timezone.utc)
    sub.status = "expired"
    sub.updated_at = now
    await db.flush()


async def _set_user_pro(db: AsyncSession, user_id: str, is_pro: bool):
    await db.execute(
        update(User).where(User.id == user_id).values(is_pro=is_pro)
    )
    await db.flush()


async def _user_has_active_subscription(db: AsyncSession, user_id: str) -> bool:
    result = await db.execute(
        select(func.count())
        .select_from(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.plan == "pro",
            Subscription.status == "active",
            Subscription.expires_at > func.now(),
        )
    )
    return result.scalar_one() > 0


def _verify_webhook_signature(payload: dict, signature: str) -> bool:
    """Verify HMAC-SHA256 signature from Pakasir webhook."""
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    expected = hmac.new(
        PAKASIR_API_KEY.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# --- Endpoints ---

class CreateInvoiceResponse(BaseModel):
    order_id: str
    payment_url: str
    amount: int


@router.post("/create-invoice", response_model=CreateInvoiceResponse)
async def create_invoice(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Pakasir payment URL for Pro upgrade."""
    user_id = user["id"]

    # Check if already Pro
    active_sub = await _get_user_active_subscription(db, user_id)
    if active_sub:
        raise HTTPException(status_code=400, detail="Already Pro subscriber")

    # Cancel any stale pending
    pending = await _get_pending_subscription(db, user_id)
    if pending:
        pending.status = "expired"
        await db.flush()

    order_id = f"da-{user_id[:8]}-{int(datetime.now(timezone.utc).timestamp())}"

    # Pakasir URL-based payment
    redirect_url = PAKASIR_SUCCESS_URL
    payment_url = (
        f"https://app.pakasir.com/pay/{PAKASIR_PROJECT_SLUG}/{PRO_AMOUNT}"
        f"?order_id={order_id}&redirect={redirect_url}"
    )

    # Save subscription record
    sub = Subscription(
        id=str(uuid.uuid4()),
        user_id=user_id,
        plan="pro",
        status="pending",
        order_id=order_id,
    )
    db.add(sub)
    await db.commit()

    return CreateInvoiceResponse(
        order_id=order_id,
        payment_url=payment_url,
        amount=PRO_AMOUNT,
    )


@router.post("/webhook")
async def pakasir_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Pakasir webhook — verify signature, update subscription status."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Verify HMAC-SHA256 signature (optional — Pakasir may not send this)
    signature = payload.get("signature", "") or request.headers.get("X-Signature", "")
    if signature and PAKASIR_API_KEY and not _verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    order_id = payload.get("order_id")
    status = payload.get("status", "").lower()

    if not order_id:
        return {"message": "OK"}

    sub = await _get_subscription_by_order_id(db, order_id)
    if not sub:
        return {"message": "OK"}

    if status in ("success", "completed"):
        if sub.status == "active":
            return {"message": "OK"}
        await _update_subscription_paid(db, sub)
        await _set_user_pro(db, sub.user_id, True)
        await db.commit()

    elif status in ("failed", "expired", "cancelled"):
        if sub.status in ("expired", "cancelled"):
            return {"message": "OK"}
        await _update_subscription_expired(db, sub)
        has_active = await _user_has_active_subscription(db, sub.user_id)
        if not has_active:
            await _set_user_pro(db, sub.user_id, False)
        await db.commit()

    return {"message": "OK"}


class SubscriptionStatusResponse(BaseModel):
    plan: str
    status: str
    is_pro: bool
    expires_at: str | None = None
    pending_payment_url: str | None = None


@router.get("/me", response_model=SubscriptionStatusResponse)
async def get_my_subscription(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's subscription status."""
    user_id = user["id"]

    active_sub = await _get_user_active_subscription(db, user_id)
    if active_sub:
        return SubscriptionStatusResponse(
            plan="pro",
            status="active",
            is_pro=True,
            expires_at=active_sub.expires_at.isoformat() if active_sub.expires_at else None,
            pending_payment_url=None,
        )

    pending = await _get_pending_subscription(db, user_id)
    pending_url = None  # payment_url not stored, user needs to create new

    return SubscriptionStatusResponse(
        plan="pro" if bool(user.get("is_pro", 0)) else "free",
        status="active" if bool(user.get("is_pro", 0)) else "free",
        is_pro=bool(user.get("is_pro", 0)),
        expires_at=None,
        pending_payment_url=pending_url,
    )


@router.delete("/cancel")
async def cancel_subscription(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel Pro subscription. Access remains until expires_at."""
    user_id = user["id"]

    active_sub = await _get_user_active_subscription(db, user_id)
    if not active_sub:
        raise HTTPException(status_code=400, detail="No active Pro subscription")

    now = datetime.now(timezone.utc)
    active_sub.status = "cancelled"
    active_sub.cancelled_at = now
    active_sub.updated_at = now
    await db.commit()

    return {
        "message": "Subscription cancelled. Pro access remains until expires_at.",
        "expires_at": active_sub.expires_at.isoformat() if active_sub.expires_at else None,
    }
