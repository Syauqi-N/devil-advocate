import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, ForeignKey,
    TIMESTAMP, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    is_pro = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    personas = relationship("Persona", back_populates="user", cascade="all, delete-orphan")
    debates = relationship("Debate", back_populates="user", cascade="all, delete-orphan")
    marketing_sessions = relationship("MarketingSession", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(512), unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    revoked = Column(Boolean, nullable=False, default=False)

    user = relationship("User", back_populates="sessions")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan = Column(String(10), nullable=False, default="free")
    status = Column(String(20), nullable=False, default="active")
    order_id = Column(String(255), nullable=True, index=True)
    qr_string = Column(Text, nullable=True)
    started_at = Column(TIMESTAMP(timezone=True), nullable=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    cancelled_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="subscriptions")


class Persona(Base):
    __tablename__ = "personas"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    advocate_name = Column(String(100), nullable=False)
    advocate_description = Column(Text, nullable=False)
    devil_name = Column(String(100), nullable=False)
    devil_description = Column(Text, nullable=False)
    is_template = Column(Boolean, nullable=False, default=False)
    is_pro_only = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="personas")
    debates = relationship("Debate", back_populates="persona")
    debate_templates = relationship("DebateTemplate", back_populates="persona")


class DebateTemplate(Base):
    __tablename__ = "debate_templates"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    topic_preset = Column(Text, nullable=False)
    persona_id = Column(UUID(as_uuid=False), ForeignKey("personas.id", ondelete="SET NULL"), nullable=True)
    is_pro = Column(Boolean, nullable=False, default=False)
    emoji = Column(String(10), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    persona = relationship("Persona", back_populates="debate_templates")
    debates = relationship("Debate", back_populates="template")


class Debate(Base):
    __tablename__ = "debates"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic = Column(Text, nullable=False)
    rounds_count = Column(Integer, nullable=False, default=2)
    verdict = Column(Text, nullable=True)
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    persona_id = Column(UUID(as_uuid=False), ForeignKey("personas.id", ondelete="SET NULL"), nullable=True)
    template_id = Column(UUID(as_uuid=False), ForeignKey("debate_templates.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="debates")
    persona = relationship("Persona", back_populates="debates")
    template = relationship("DebateTemplate", back_populates="debates")
    rounds = relationship("DebateRound", back_populates="debate", cascade="all, delete-orphan")


class MarketingSession(Base):
    __tablename__ = "marketing_sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_description = Column(Text, nullable=False)
    answers = Column(Text, nullable=True)  # JSON array of {question, answer}
    strategy = Column(Text, nullable=True)  # JSON structured strategy
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="marketing_sessions")
    questions = relationship("MarketingQuestion", back_populates="session", cascade="all, delete-orphan")


class MarketingQuestion(Base):
    __tablename__ = "marketing_questions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("marketing_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(Text, nullable=True)  # JSON array of strings
    answer = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("session_id", "question_number", name="uq_marketing_questions_session_num"),
    )

    session = relationship("MarketingSession", back_populates="questions")


class DebateRound(Base):
    __tablename__ = "debate_rounds"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    debate_id = Column(UUID(as_uuid=False), ForeignKey("debates.id", ondelete="CASCADE"), nullable=False, index=True)
    round_number = Column(Integer, nullable=False)
    advocate_argument = Column(Text, nullable=False)
    devil_argument = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("debate_id", "round_number", name="uq_debate_rounds_debate_round"),
    )

    debate = relationship("Debate", back_populates="rounds")
