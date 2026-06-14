"""Remove passcode_hash from projects

Revision ID: 006
Revises: 005
Create Date: 2026-06-14 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("projects", "passcode_hash")


def downgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("passcode_hash", sa.String(255), nullable=False, server_default=""),
    )
