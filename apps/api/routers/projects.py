import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.role_guard import require_project_role
from schemas.auth import UserOut
from schemas.project import (
    ProjectCreate,
    ProjectMemberOut,
    ProjectOut,
    ProjectPublic,
    ProjectSummary,
    ProjectUpdate,
    UpdateMemberRoleRequest,
)
from schemas.share import ProjectShareRequest, ShareResponse
from services import auth_service, email_service, project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.create_project(current_user, data, db)


@router.get("", response_model=list[ProjectSummary])
async def list_projects(
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.get_user_projects(current_user.id, db)


@router.get("/{project_id}/public", response_model=ProjectPublic)
async def get_project_public(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await project_service.get_project_public(project_id, db)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.get_project(project_id, current_user.id, db)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: UserOut = Depends(require_project_role("project_manager")),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.update_project(project_id, data, current_user.id, db)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    current_user: UserOut = Depends(require_project_role("project_manager")),
    db: AsyncSession = Depends(get_db),
):
    await project_service.delete_project(project_id, current_user.id, db)


@router.post("/{project_id}/join", response_model=ProjectOut)
async def join_project(
    project_id: uuid.UUID,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.join_project(current_user, project_id, db)


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
async def get_members(
    project_id: uuid.UUID,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.get_members(project_id, current_user.id, db)


@router.post("/{project_id}/share", response_model=ShareResponse)
async def share_project(
    project_id: uuid.UUID,
    data: ProjectShareRequest,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await email_service.share_project(project_id, current_user.id, data.recipient_email, data.access_type, data.message, db)
    return ShareResponse()


@router.patch("/{project_id}/members/{user_id}", response_model=ProjectMemberOut)
async def update_member_role(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    data: UpdateMemberRoleRequest,
    current_user: UserOut = Depends(require_project_role("project_manager")),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.update_member_role(project_id, current_user.id, user_id, data.role, db)
