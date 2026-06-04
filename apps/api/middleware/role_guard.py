import uuid

from fastapi import Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.project import ProjectMember
from schemas.auth import UserOut
from services.auth_service import get_current_user

ROLE_LEVELS: dict[str, int] = {
    "executive": 1,
    "member": 2,
    "project_manager": 3,
}


def require_project_role(minimum_role: str):
    async def check(
        project_id: uuid.UUID = Path(...),
        current_user: UserOut = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> UserOut:
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        pm = result.scalar_one_or_none()
        if not pm:
            raise HTTPException(status_code=403, detail="Not a member of this project")
        if ROLE_LEVELS.get(pm.role, 0) < ROLE_LEVELS.get(minimum_role, 0):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return current_user

    return check
