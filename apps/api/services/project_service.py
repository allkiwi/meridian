import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.milestone import Milestone
from models.project import Project, ProjectMember
from models.user import User
from schemas.auth import UserOut
from schemas.project import (
    JoinProjectRequest,
    ProjectCreate,
    ProjectMemberOut,
    ProjectOut,
    ProjectPublic,
    ProjectSummary,
    ProjectUpdate,
)
from utils.audit_log import log_action
from utils.passcode import generate_project_passcode, hash_password, verify_password


async def create_project(owner: UserOut, data: ProjectCreate, db: AsyncSession) -> ProjectOut:
    passcode = generate_project_passcode()

    project = Project(
        id=uuid.uuid4(),
        org_id=None,
        name=data.name,
        description=data.description,
        owner_id=owner.id,
        passcode_hash=hash_password(passcode),
        status="active",
    )
    db.add(project)
    await db.flush()

    member = ProjectMember(
        id=uuid.uuid4(),
        project_id=project.id,
        user_id=owner.id,
        role="project_manager",
    )
    db.add(member)
    await db.flush()

    await log_action(db, owner.id, "project.created", "project", project.id, {"name": data.name})

    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        owner_id=project.owner_id,
        created_at=project.created_at,
        member_count=1,
        milestone_count=0,
        passcode=passcode,
    )


async def get_user_projects(user_id: uuid.UUID, db: AsyncSession) -> list[ProjectSummary]:
    result = await db.execute(
        select(Project, func.count(ProjectMember.id).label("member_count"))
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(
            ProjectMember.user_id == user_id,
            Project.deleted_at.is_(None),
        )
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
    )
    rows = result.all()

    if not rows:
        return []

    project_ids = [row.Project.id for row in rows]

    next_dates_result = await db.execute(
        select(Milestone.project_id, func.min(Milestone.target_date).label("next_date"))
        .where(
            Milestone.project_id.in_(project_ids),
            Milestone.target_date.is_not(None),
            Milestone.deleted_at.is_(None),
            Milestone.status != "complete",
        )
        .group_by(Milestone.project_id)
    )
    next_dates = {str(r.project_id): r.next_date for r in next_dates_result}

    return [
        ProjectSummary(
            id=row.Project.id,
            name=row.Project.name,
            status=row.Project.status,
            owner_id=row.Project.owner_id,
            created_at=row.Project.created_at,
            member_count=row.member_count,
            next_milestone_date=next_dates.get(str(row.Project.id)),
        )
        for row in rows
    ]


async def _project_out(project: Project, db: AsyncSession, passcode: str | None = None) -> ProjectOut:
    member_count = (
        await db.execute(
            select(func.count(ProjectMember.id)).where(ProjectMember.project_id == project.id)
        )
    ).scalar_one()

    milestone_count = (
        await db.execute(
            select(func.count(Milestone.id)).where(
                Milestone.project_id == project.id,
                Milestone.deleted_at.is_(None),
            )
        )
    ).scalar_one()

    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        owner_id=project.owner_id,
        created_at=project.created_at,
        member_count=member_count,
        milestone_count=milestone_count,
        passcode=passcode,
    )


async def _require_member(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> ProjectMember:
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=403, detail="Not a member of this project")
    return pm


async def get_project(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> ProjectOut:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await _require_member(project_id, user_id, db)
    return await _project_out(project, db)


async def get_project_public(project_id: uuid.UUID, db: AsyncSession) -> ProjectPublic:
    result = await db.execute(
        select(Project, User.name.label("owner_name"))
        .join(User, Project.owner_id == User.id)
        .where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectPublic(id=row.Project.id, name=row.Project.name, owner_name=row.owner_name)


async def update_project(
    project_id: uuid.UUID, data: ProjectUpdate, user_id: uuid.UUID, db: AsyncSession
) -> ProjectOut:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return await _project_out(project, db)


async def delete_project(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await log_action(db, user_id, "project.deleted", "project", project_id)


async def join_project(
    user: UserOut, project_id: uuid.UUID, data: JoinProjectRequest, db: AsyncSession
) -> ProjectOut:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not verify_password(data.passcode, project.passcode_hash):
        raise HTTPException(status_code=403, detail="Invalid passcode")

    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member of this project")

    member = ProjectMember(
        id=uuid.uuid4(),
        project_id=project_id,
        user_id=user.id,
        role="member",
    )
    db.add(member)
    await db.flush()

    await log_action(db, user.id, "project.joined", "project", project_id, {"project_name": project.name})
    return await _project_out(project, db)


async def get_members(project_id: uuid.UUID, requesting_user_id: uuid.UUID, db: AsyncSession) -> list[ProjectMemberOut]:
    await _require_member(project_id, requesting_user_id, db)

    result = await db.execute(
        select(ProjectMember, User.name, User.email)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.joined_at)
    )

    return [
        ProjectMemberOut(
            user_id=pm.user_id,
            name=name,
            email=email,
            role=pm.role,
            joined_at=pm.joined_at,
        )
        for pm, name, email in result.all()
    ]


async def update_member_role(
    project_id: uuid.UUID,
    pm_user_id: uuid.UUID,
    target_user_id: uuid.UUID,
    new_role: str,
    db: AsyncSession,
) -> ProjectMemberOut:
    # Verify requester is PM
    requester_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == pm_user_id,
            ProjectMember.role == "project_manager",
        )
    )
    if not requester_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Project manager role required")

    if pm_user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    target_result = await db.execute(
        select(ProjectMember, User.name, User.email)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id, ProjectMember.user_id == target_user_id)
    )
    row = target_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")

    pm, name, email = row
    old_role = pm.role
    pm.role = new_role
    await db.flush()

    await log_action(
        db, pm_user_id, "member.role_changed", "project_member", pm.id,
        {"old_role": old_role, "new_role": new_role, "target_user_id": str(target_user_id)},
    )

    return ProjectMemberOut(user_id=pm.user_id, name=name, email=email, role=pm.role, joined_at=pm.joined_at)
