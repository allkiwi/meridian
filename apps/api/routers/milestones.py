import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.role_guard import require_project_role
from schemas.auth import UserOut
from schemas.milestone import GanttItem, MilestoneCreate, MilestoneOut, MilestoneUpdate
from schemas.share import ShareRequest, ShareResponse
from services import auth_service, email_service, milestone_service

router = APIRouter(tags=["milestones"])


@router.post("/projects/{project_id}/milestones", response_model=MilestoneOut, status_code=201)
async def create_milestone(
    project_id: uuid.UUID,
    data: MilestoneCreate,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await milestone_service.create_milestone(project_id, data, current_user, db)


@router.get("/projects/{project_id}/milestones", response_model=list[MilestoneOut])
async def list_milestones(
    project_id: uuid.UUID,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await milestone_service.get_milestones(project_id, current_user.id, db)


@router.get("/projects/{project_id}/gantt", response_model=list[GanttItem])
async def get_gantt(
    project_id: uuid.UUID,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await milestone_service.get_gantt_data(project_id, current_user.id, db)


@router.get("/milestones/{milestone_id}", response_model=MilestoneOut)
async def get_milestone(
    milestone_id: uuid.UUID,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await milestone_service.get_milestone(milestone_id, current_user.id, db)


@router.patch("/milestones/{milestone_id}", response_model=MilestoneOut)
async def update_milestone(
    milestone_id: uuid.UUID,
    data: MilestoneUpdate,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await milestone_service.update_milestone(milestone_id, data, current_user, db)


@router.delete("/milestones/{milestone_id}", status_code=204)
async def delete_milestone(
    milestone_id: uuid.UUID,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await milestone_service.delete_milestone(milestone_id, current_user, db)


@router.post("/milestones/{milestone_id}/share", response_model=ShareResponse)
async def share_milestone(
    milestone_id: uuid.UUID,
    data: ShareRequest,
    current_user: UserOut = Depends(auth_service.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await email_service.share_milestone(milestone_id, current_user.id, data.recipient_email, data.message, db)
    return ShareResponse()
