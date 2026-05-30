"""add_marketing_tables

Revision ID: d1e2f3a4b5c6
Revises: c3d4e5f6a7b8
Create Date: 2026-05-22 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'marketing_sessions',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('business_description', sa.Text(), nullable=False),
        sa.Column('answers', sa.Text(), nullable=True),
        sa.Column('strategy', sa.Text(), nullable=True),
        sa.Column('share_token', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('share_token'),
    )
    op.create_index('ix_marketing_sessions_user_id', 'marketing_sessions', ['user_id'])
    op.create_index('ix_marketing_sessions_share_token', 'marketing_sessions', ['share_token'])

    op.create_table(
        'marketing_questions',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('session_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('question_number', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('options', sa.Text(), nullable=True),
        sa.Column('answer', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['marketing_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id', 'question_number', name='uq_marketing_questions_session_num'),
    )
    op.create_index('ix_marketing_questions_session_id', 'marketing_questions', ['session_id'])


def downgrade() -> None:
    op.drop_table('marketing_questions')
    op.drop_table('marketing_sessions')
