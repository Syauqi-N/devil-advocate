"""
routers/marketing.py — AI Marketing Strategy endpoints

POST /marketing/start          → mulai sesi baru, stream pertanyaan pertama
POST /marketing/answer         → kirim jawaban, stream pertanyaan berikutnya atau strategi
GET  /marketing                → list sesi user (paginated)
GET  /marketing/share/{token}  → public share
GET  /marketing/{id}           → detail sesi (owner only)
GET  /me/marketing-usage       → sisa kuota hari ini
"""
import json
import secrets
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth.middleware import get_current_user
from config import MAX_MARKETING_FREE
from database import get_db, AsyncSessionLocal
from marketing_agents import run_marketing_session, MAX_QUESTIONS
from models import MarketingSession, MarketingQuestion, User

router = APIRouter(prefix="/marketing", tags=["marketing"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StartRequest(BaseModel):
    business_description: str = Field(..., min_length=10, max_length=1000)

class AnswerRequest(BaseModel):
    session_id: str
    answer: str = Field(..., min_length=1, max_length=500)

class QuestionOut(BaseModel):
    question_number: int
    question_text: str
    options: list[str]
    answer: Optional[str] = None

class StrategyChannel(BaseModel):
    name: str
    tactic: str
    budget_pct: int
    priority: str

class StrategyTimeline(BaseModel):
    period: str
    focus: str
    actions: list[str]

class StrategyOut(BaseModel):
    summary: str
    positioning: str
    target_audience: str
    channels: list[dict]
    budget_allocation: str
    timeline: list[dict]
    kpis: list[str]
    quick_wins: list[str]

class MarketingSessionOut(BaseModel):
    id: str
    business_description: str
    questions: list[QuestionOut]
    strategy: Optional[dict] = None
    share_token: str
    created_at: str
    is_complete: bool

class MarketingListItem(BaseModel):
    id: str
    business_description: str
    share_token: str
    is_complete: bool
    created_at: str

class MarketingListResponse(BaseModel):
    items: list[MarketingListItem]
    total: int
    page: int
    limit: int
    has_next: bool

class MarketingUsageResponse(BaseModel):
    used: int
    limit: int
    remaining: int

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def sse_event(data: dict) -> str:
    return "data: " + json.dumps(data, ensure_ascii=False) + "\n\n"

async def _count_marketing_today(db: AsyncSession, user_id: str) -> int:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(MarketingSession.id))
        .where(MarketingSession.user_id == user_id)
        .where(MarketingSession.created_at >= today_start)
    )
    return int(result.scalar() or 0)

def _serialize_session(session: MarketingSession) -> MarketingSessionOut:
    questions_sorted = sorted(session.questions, key=lambda q: q.question_number)
    strategy = None
    if session.strategy:
        try:
            strategy = json.loads(session.strategy)
        except Exception:
            strategy = None
    return MarketingSessionOut(
        id=str(session.id),
        business_description=session.business_description,
        questions=[
            QuestionOut(
                question_number=q.question_number,
                question_text=q.question_text,
                options=json.loads(q.options) if q.options else [],
                answer=q.answer,
            )
            for q in questions_sorted
        ],
        strategy=strategy,
        share_token=session.share_token,
        created_at=session.created_at.isoformat(),
        is_complete=session.strategy is not None,
    )

# ---------------------------------------------------------------------------
# POST /marketing/start
# ---------------------------------------------------------------------------

@router.post("/start")
async def start_marketing_session(
    req: StartRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["id"]
    is_pro = bool(user.get("is_pro", False))

    # Daily limit check
    if not is_pro:
        used_today = await _count_marketing_today(db, user_id)
        if used_today >= MAX_MARKETING_FREE:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Daily marketing limit reached. Upgrade to Pro for unlimited access.",
            )

    # Create session
    share_token = secrets.token_urlsafe(16)
    session = MarketingSession(
        user_id=user_id,
        business_description=req.business_description,
        share_token=share_token,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    session_id = str(session.id)

    async def stream() -> AsyncGenerator[str, None]:
        import logging
        logger = logging.getLogger("marketing")
        try:
            yield sse_event({"type": "init", "session_id": session_id, "share_token": share_token})

            async for event in run_marketing_session(
                business_description=req.business_description,
                qa_history=[],
                question_number=1,
            ):
                if event["type"] == "question":
                    # Save question to DB
                    import database as _db
                    async with _db.AsyncSessionLocal() as save_db:
                        save_db.add(MarketingQuestion(
                            session_id=session_id,
                            question_number=event["number"],
                            question_text=event["text"],
                            options=json.dumps(event["options"], ensure_ascii=False),
                        ))
                        await save_db.commit()
                    yield sse_event(event)
                elif event["type"] in ("generating_strategy", "strategy", "done", "error"):
                    if event["type"] == "strategy":
                        # Save strategy
                        import database as _db
                        async with _db.AsyncSessionLocal() as save_db:
                            result = await save_db.execute(
                                select(MarketingSession).where(MarketingSession.id == session_id)
                            )
                            s = result.scalar_one()
                            s.strategy = json.dumps(event["content"], ensure_ascii=False)
                            await save_db.commit()
                    yield sse_event(event)
        except Exception as e:
            import traceback
            logger.error(f"[marketing:{session_id}] {e}\n{traceback.format_exc()}")
            yield sse_event({"type": "error", "message": str(e)})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ---------------------------------------------------------------------------
# POST /marketing/answer
# ---------------------------------------------------------------------------

@router.post("/answer")
async def answer_question(
    req: AnswerRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["id"]

    # Validate session ownership
    try:
        uuid.UUID(req.session_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(MarketingSession)
        .where(MarketingSession.id == req.session_id)
        .options(selectinload(MarketingSession.questions))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if session.strategy:
        raise HTTPException(status_code=400, detail="Session already complete")

    # Find unanswered question (latest)
    questions_sorted = sorted(session.questions, key=lambda q: q.question_number)
    unanswered = next((q for q in reversed(questions_sorted) if q.answer is None), None)
    if not unanswered:
        raise HTTPException(status_code=400, detail="No unanswered question found")

    # Save answer
    unanswered.answer = req.answer
    await db.commit()

    # Build Q&A history
    qa_history = [
        {"question": q.question_text, "answer": q.answer}
        for q in questions_sorted
        if q.answer is not None
    ]

    next_question_number = unanswered.question_number + 1
    session_id = str(session.id)
    business_description = session.business_description

    async def stream() -> AsyncGenerator[str, None]:
        import logging
        logger = logging.getLogger("marketing")
        try:
            async for event in run_marketing_session(
                business_description=business_description,
                qa_history=qa_history,
                question_number=next_question_number,
            ):
                if event["type"] == "question":
                    import database as _db
                    async with _db.AsyncSessionLocal() as save_db:
                        save_db.add(MarketingQuestion(
                            session_id=session_id,
                            question_number=event["number"],
                            question_text=event["text"],
                            options=json.dumps(event["options"], ensure_ascii=False),
                        ))
                        await save_db.commit()
                    yield sse_event(event)
                elif event["type"] == "strategy":
                    import database as _db
                    async with _db.AsyncSessionLocal() as save_db:
                        result = await save_db.execute(
                            select(MarketingSession).where(MarketingSession.id == session_id)
                        )
                        s = result.scalar_one()
                        s.strategy = json.dumps(event["content"], ensure_ascii=False)
                        await save_db.commit()
                    yield sse_event(event)
                else:
                    yield sse_event(event)
        except Exception as e:
            import traceback
            logger.error(f"[marketing:{session_id}] {e}\n{traceback.format_exc()}")
            yield sse_event({"type": "error", "message": str(e)})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ---------------------------------------------------------------------------
# GET /marketing — list
# ---------------------------------------------------------------------------

@router.get("", response_model=MarketingListResponse)
async def list_marketing_sessions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["id"]
    offset = (page - 1) * limit

    total_result = await db.execute(
        select(func.count(MarketingSession.id)).where(MarketingSession.user_id == user_id)
    )
    total = int(total_result.scalar() or 0)

    result = await db.execute(
        select(MarketingSession)
        .where(MarketingSession.user_id == user_id)
        .order_by(MarketingSession.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    sessions = result.scalars().all()

    items = [
        MarketingListItem(
            id=str(s.id),
            business_description=s.business_description,
            share_token=s.share_token,
            is_complete=s.strategy is not None,
            created_at=s.created_at.isoformat(),
        )
        for s in sessions
    ]

    return MarketingListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_next=(offset + limit) < total,
    )

# ---------------------------------------------------------------------------
# GET /marketing/share/{token} — public (must be before /{id})
# ---------------------------------------------------------------------------

@router.get("/share/{share_token}", response_model=MarketingSessionOut)
async def get_shared_marketing_session(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MarketingSession)
        .where(MarketingSession.share_token == share_token)
        .options(selectinload(MarketingSession.questions))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _serialize_session(session)

# ---------------------------------------------------------------------------
# GET /marketing/{id} — detail (owner only)
# ---------------------------------------------------------------------------

@router.get("/{session_id}", response_model=MarketingSessionOut)
async def get_marketing_session(
    session_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        uuid.UUID(session_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(MarketingSession)
        .where(MarketingSession.id == session_id)
        .options(selectinload(MarketingSession.questions))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return _serialize_session(session)

# ---------------------------------------------------------------------------
# GET /me/marketing-usage
# ---------------------------------------------------------------------------

@router.get("/me/usage", response_model=MarketingUsageResponse)
async def get_marketing_usage(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    used = await _count_marketing_today(db, user["id"])
    is_pro = bool(user.get("is_pro", False))
    if is_pro:
        return MarketingUsageResponse(used=used, limit=-1, remaining=-1)
    return MarketingUsageResponse(
        used=used,
        limit=MAX_MARKETING_FREE,
        remaining=max(0, MAX_MARKETING_FREE - used),
    )
