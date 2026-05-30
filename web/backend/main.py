"""
main.py — Devil's Advocate v2 backend (PostgreSQL + JWT auth).

Endpoints:
- POST /debate            — JWT-protected, SSE streaming, daily limit (Free 1/day, Pro unlimited)
- GET  /debates           — paginated list user's debates
- GET  /debates/{id}      — debate detail (owner only)
- GET  /debates/share/{token} — public share
- GET  /me/usage          — usage stats today
- GET  /health            — health check
- /subscription/*         — Xendit integration
"""
import json
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from agents import run_debate
from auth import get_current_user
from config import CORS_ORIGINS, MAX_DEBATES_FREE
from database import AsyncSessionLocal, get_db, init_db
from models import Debate, DebateRound, DebateTemplate, Persona, User
from routers.auth import router as auth_router
from routers.subscription import router as subscription_router
from routers.personas import router as personas_router
from routers.templates import router as templates_router
from routers.marketing import router as marketing_router


# ---------------------------------------------------------------------------
# App lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Devil Advocate API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(subscription_router)
app.include_router(personas_router)
app.include_router(templates_router)
app.include_router(marketing_router)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DebateRequest(BaseModel):
    topic: str = Field(..., min_length=5, max_length=500)
    rounds_count: int = Field(default=3, ge=2, le=3)
    persona_id: Optional[str] = None
    template_id: Optional[str] = None


class RoundOut(BaseModel):
    round_number: int
    advocate_argument: str
    devil_argument: str


class PersonaSummary(BaseModel):
    id: str
    name: str
    advocate_name: Optional[str] = None
    devil_name: Optional[str] = None


class TemplateSummary(BaseModel):
    id: str
    name: str


class DebateOut(BaseModel):
    id: str
    topic: str
    rounds_count: int
    verdict: Optional[str] = None
    share_token: str
    persona: Optional[PersonaSummary] = None
    template: Optional[TemplateSummary] = None
    rounds: list[RoundOut] = []
    created_at: str


class DebateListItem(BaseModel):
    id: str
    topic: str
    rounds_count: int
    share_token: str
    persona: Optional[PersonaSummary] = None
    template: Optional[TemplateSummary] = None
    created_at: str


class DebateListResponse(BaseModel):
    items: list[DebateListItem]
    total: int
    page: int
    limit: int
    has_next: bool


class UsageResponse(BaseModel):
    used: int
    limit: int
    remaining: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def sse_event(data: dict) -> str:
    return "data: " + json.dumps(data, ensure_ascii=False) + "\n\n"


def _generate_share_token() -> str:
    return secrets.token_urlsafe(16)


async def _count_debates_today(db: AsyncSession, user_id: str) -> int:
    """Count debates created today (UTC) for daily limit check."""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    result = await db.execute(
        select(func.count(Debate.id))
        .where(Debate.user_id == user_id)
        .where(Debate.created_at >= today_start)
    )
    return int(result.scalar() or 0)


async def _validate_persona(
    db: AsyncSession, persona_id: str, user_id: str
) -> Persona:
    """Validate persona exists and is accessible by user (owner or template)."""
    try:
        uuid.UUID(persona_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid persona_id format",
        )

    result = await db.execute(
        select(Persona).where(Persona.id == persona_id)
    )
    persona = result.scalar_one_or_none()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Persona not found or not accessible",
        )

    # Accessible if: it's a template OR owned by the user
    if not persona.is_template and persona.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Persona not found or not accessible",
        )
    return persona


async def _validate_template(
    db: AsyncSession, template_id: str
) -> DebateTemplate:
    """Validate template exists."""
    try:
        uuid.UUID(template_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template_id format",
        )

    result = await db.execute(
        select(DebateTemplate).where(DebateTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    return template


def _persona_to_descriptions(persona: Persona) -> tuple[str, str]:
    """Build advocate/devil persona descriptions for LLM system prompt."""
    advocate_desc = (
        f"Kamu berperan sebagai {persona.advocate_name}: {persona.advocate_description}"
    )
    devil_desc = (
        f"Kamu berperan sebagai {persona.devil_name}: {persona.devil_description}"
    )
    return advocate_desc, devil_desc


# ---------------------------------------------------------------------------
# POST /debate — main endpoint
# ---------------------------------------------------------------------------

@app.post("/debate")
async def create_debate(
    req: DebateRequest,
    request: Request,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Buat debat baru + stream hasilnya via SSE.
    Free: max 1/hari → 429 DAILY_LIMIT_REACHED.
    Pro: unlimited.
    """
    user_id = user["id"]
    is_pro = bool(user.get("is_pro", False))

    # --- Daily limit check (Free only) ---
    if not is_pro:
        used_today = await _count_debates_today(db, user_id)
        if used_today >= MAX_DEBATES_FREE:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Daily limit reached. Upgrade to Pro for unlimited debates.",
            )

    # --- Validate persona/template (if provided) ---
    advocate_persona_desc: Optional[str] = None
    devil_persona_desc: Optional[str] = None
    persona_obj: Optional[Persona] = None
    template_obj: Optional[DebateTemplate] = None

    if req.persona_id:
        persona_obj = await _validate_persona(db, req.persona_id, user_id)
        advocate_persona_desc, devil_persona_desc = _persona_to_descriptions(persona_obj)

    if req.template_id:
        template_obj = await _validate_template(db, req.template_id)

    # --- Reserve debate row immediately so frontend can redirect ---
    share_token = _generate_share_token()
    debate = Debate(
        user_id=user_id,
        topic=req.topic,
        rounds_count=req.rounds_count,
        share_token=share_token,
        persona_id=req.persona_id if persona_obj else None,
        template_id=req.template_id if template_obj else None,
    )
    db.add(debate)
    await db.commit()
    await db.refresh(debate)
    debate_id = str(debate.id)

    # --- SSE streaming ---
    async def stream() -> AsyncGenerator[str, None]:
        import logging
        logger = logging.getLogger("debate")
        try:
            yield sse_event({
                "type": "init",
                "id": debate_id,
                "share_token": share_token,
            })
            logger.info(f"[debate:{debate_id}] init sent")

            collected_rounds: list[dict] = []
            verdict_text: Optional[str] = None

            async for event in run_debate(
                topic=req.topic,
                rounds_count=req.rounds_count,
                advocate_persona=advocate_persona_desc,
                devil_persona=devil_persona_desc,
            ):
                if event["type"] == "round":
                    collected_rounds.append({
                        "round": event["round"],
                        "advocate": event["advocate"],
                        "devil": event["devil"],
                    })
                    logger.info(f"[debate:{debate_id}] round {event['round']} received")
                    yield sse_event({
                        "type": "round",
                        "round": event["round"],
                        "advocate": event["advocate"],
                        "devil": event["devil"],
                    })
                elif event["type"] == "verdict":
                    verdict_text = event["verdict"]
                    logger.info(f"[debate:{debate_id}] verdict received")
                    yield sse_event({
                        "type": "verdict",
                        "content": verdict_text,
                    })
                elif event["type"] == "done":
                    logger.info(f"[debate:{debate_id}] done event — saving {len(collected_rounds)} rounds")
                    # Persist rounds + verdict — import module reference, not cached None
                    import database as _db
                    if _db.AsyncSessionLocal is None:
                        raise RuntimeError("DB not initialized")
                    async with _db.AsyncSessionLocal() as save_db:
                        # Update verdict on debate
                        result = await save_db.execute(
                            select(Debate).where(Debate.id == debate_id)
                        )
                        d = result.scalar_one()
                        d.verdict = verdict_text
                        # Insert rounds
                        for r in collected_rounds:
                            save_db.add(DebateRound(
                                debate_id=debate_id,
                                round_number=r["round"],
                                advocate_argument=r["advocate"],
                                devil_argument=r["devil"],
                            ))
                        await save_db.commit()
                    logger.info(f"[debate:{debate_id}] saved to DB")

                    yield sse_event({
                        "type": "done",
                        "id": debate_id,
                        "share_token": share_token,
                    })
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            logger.error(f"[debate:{debate_id}] error: {e}\n{traceback.format_exc()}")
            yield sse_event({"type": "error", "message": str(e)})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# GET /debates — paginated list
# ---------------------------------------------------------------------------

@app.get("/debates", response_model=DebateListResponse)
async def list_debates(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["id"]
    offset = (page - 1) * limit

    # Total
    total_result = await db.execute(
        select(func.count(Debate.id)).where(Debate.user_id == user_id)
    )
    total = int(total_result.scalar() or 0)

    # Items
    result = await db.execute(
        select(Debate)
        .where(Debate.user_id == user_id)
        .options(selectinload(Debate.persona), selectinload(Debate.template))
        .order_by(Debate.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    debates = result.scalars().all()

    items = [
        DebateListItem(
            id=str(d.id),
            topic=d.topic,
            rounds_count=d.rounds_count,
            share_token=d.share_token,
            persona=PersonaSummary(
                id=str(d.persona.id),
                name=d.persona.name,
                advocate_name=d.persona.advocate_name,
                devil_name=d.persona.devil_name,
            ) if d.persona else None,
            template=TemplateSummary(
                id=str(d.template.id),
                name=d.template.name,
            ) if d.template else None,
            created_at=d.created_at.isoformat(),
        )
        for d in debates
    ]

    return DebateListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_next=(offset + limit) < total,
    )


# ---------------------------------------------------------------------------
# GET /debates/share/{token} — public share (must be before /{debate_id})
# ---------------------------------------------------------------------------

@app.get("/debates/share/{share_token}", response_model=DebateOut)
async def get_shared_debate(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Debate)
        .where(Debate.share_token == share_token)
        .options(
            selectinload(Debate.persona),
            selectinload(Debate.template),
            selectinload(Debate.rounds),
        )
    )
    debate = result.scalar_one_or_none()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")
    return _serialize_debate(debate)


# ---------------------------------------------------------------------------
# GET /debates/{id} — debate detail (owner only)
# ---------------------------------------------------------------------------

@app.get("/debates/{debate_id}", response_model=DebateOut)
async def get_debate_detail(
    debate_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        uuid.UUID(debate_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Debate not found")

    result = await db.execute(
        select(Debate)
        .where(Debate.id == debate_id)
        .options(
            selectinload(Debate.persona),
            selectinload(Debate.template),
            selectinload(Debate.rounds),
        )
    )
    debate = result.scalar_one_or_none()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return _serialize_debate(debate)


def _serialize_debate(debate: Debate) -> DebateOut:
    rounds_sorted = sorted(debate.rounds, key=lambda r: r.round_number)
    return DebateOut(
        id=str(debate.id),
        topic=debate.topic,
        rounds_count=debate.rounds_count,
        verdict=debate.verdict,
        share_token=debate.share_token,
        persona=PersonaSummary(
            id=str(debate.persona.id),
            name=debate.persona.name,
            advocate_name=debate.persona.advocate_name,
            devil_name=debate.persona.devil_name,
        ) if debate.persona else None,
        template=TemplateSummary(
            id=str(debate.template.id),
            name=debate.template.name,
        ) if debate.template else None,
        rounds=[
            RoundOut(
                round_number=r.round_number,
                advocate_argument=r.advocate_argument,
                devil_argument=r.devil_argument,
            )
            for r in rounds_sorted
        ],
        created_at=debate.created_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /me/usage
# ---------------------------------------------------------------------------

@app.get("/me/usage", response_model=UsageResponse)
async def get_my_usage(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    used = await _count_debates_today(db, user["id"])
    is_pro = bool(user.get("is_pro", False))
    if is_pro:
        return UsageResponse(used=used, limit=-1, remaining=-1)
    return UsageResponse(
        used=used,
        limit=MAX_DEBATES_FREE,
        remaining=max(0, MAX_DEBATES_FREE - used),
    )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}
