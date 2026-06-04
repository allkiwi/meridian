import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    detail: dict[str, Any] | None = None,
) -> None:
    entry = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
    )
    db.add(entry)
    await db.flush()
