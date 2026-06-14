"""Add milestone_shares table

Revision ID: 005
Revises: 004
Create Date: 2026-06-14 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "milestone_shares",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("milestone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shared_with_email", sa.String(255), nullable=False),
        sa.Column("shared_with_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("access_type", sa.String(10), nullable=False, server_default="view"),
        sa.Column("granted_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["milestone_id"], ["milestones.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shared_with_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["granted_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("milestone_id", "shared_with_email", name="uq_milestone_shares_milestone_email"),
    )
    op.create_index("ix_milestone_shares_milestone_id", "milestone_shares", ["milestone_id"])
    op.create_index("ix_milestone_shares_shared_with_id", "milestone_shares", ["shared_with_id"])


def downgrade() -> None:
    op.drop_index("ix_milestone_shares_shared_with_id", table_name="milestone_shares")
    op.drop_index("ix_milestone_shares_milestone_id", table_name="milestone_shares")
    op.drop_table("milestone_shares")
