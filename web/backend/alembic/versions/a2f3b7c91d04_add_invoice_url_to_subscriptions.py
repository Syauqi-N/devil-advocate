"""add invoice_url to subscriptions

Revision ID: a2f3b7c91d04
Revises: 811e406fbc91
Create Date: 2026-05-22 04:17:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2f3b7c91d04'
down_revision: Union[str, None] = '811e406fbc91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('subscriptions', sa.Column('invoice_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('subscriptions', 'invoice_url')
