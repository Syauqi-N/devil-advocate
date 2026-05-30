"""replace xendit with pakasir columns

Revision ID: c3d4e5f6a7b8
Revises: a2f3b7c91d04
Create Date: 2026-05-22 05:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'a2f3b7c91d04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new Pakasir columns
    op.add_column('subscriptions', sa.Column('order_id', sa.String(255), nullable=True))
    op.add_column('subscriptions', sa.Column('qr_string', sa.Text(), nullable=True))
    op.create_index('ix_subscriptions_order_id', 'subscriptions', ['order_id'])

    # Drop old Xendit columns
    op.drop_index('ix_subscriptions_xendit_invoice_id', table_name='subscriptions')
    op.drop_column('subscriptions', 'xendit_invoice_id')
    op.drop_column('subscriptions', 'xendit_payment_id')
    op.drop_column('subscriptions', 'invoice_url')


def downgrade() -> None:
    # Restore Xendit columns
    op.add_column('subscriptions', sa.Column('xendit_invoice_id', sa.String(255), nullable=True))
    op.add_column('subscriptions', sa.Column('xendit_payment_id', sa.String(255), nullable=True))
    op.add_column('subscriptions', sa.Column('invoice_url', sa.Text(), nullable=True))
    op.create_index('ix_subscriptions_xendit_invoice_id', 'subscriptions', ['xendit_invoice_id'])

    # Drop Pakasir columns
    op.drop_index('ix_subscriptions_order_id', table_name='subscriptions')
    op.drop_column('subscriptions', 'order_id')
    op.drop_column('subscriptions', 'qr_string')
