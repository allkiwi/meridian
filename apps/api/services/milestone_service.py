import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.milestone import Milestone
from models.project import ProjectMember
from schemas.auth import UserOut
from schemas.milestone import GanttItem, MilestoneCreate, MilestoneOut, MilestoneUpdate
from utils.audit_log import log_action


def _days_until(target_date) -> int | None:
    if target_date is None:
        return None
    return (target_date - datetime.now(timezone.utc).date()).days


def _build_tree(
    by_parent: dict[str | None, list[Milestone]],
    parent_id: str | None,
) -> list[MilestoneOut]:
    children = sorted(
        by_parent.get(parent_id, []),
        key=lambda m: (m.sort_order, m.created_at),
    )
    result = []
    for m in children:
        out = MilestoneOut(
            id=m.id,
            title=m.title,
            description=m.description,
            status=m.status,
            target_date=m.target_date,
            owner_id=m.owner_id,
            owner_name=m.owner.name if m.owner else None,
            project_id=m.project_id,
            parent_milestone_id=m.parent_milestone_id,
            sort_order=m.sort_order,
            created_at=m.created_at,
            children=_build_tree(by_parent, str(m.id)),
            days_until_due=_days_until(m.target_date),
        )
        result.append(out)
    return result


def _flatten_tree(
    by_parent: dict[str | None, list[Milestone]],
    parent_id: str | None,
    depth: int,
) -> list[GanttItem]:
    children = sorted(
        by_parent.get(parent_id, []),
        key=lambda m: (m.sort_order, m.target_date or datetime.max.date(), m.created_at),
    )
    result = []
    for m in children:
        result.append(
            GanttItem(
                id=m.id,
                title=m.title,
                owner_name=m.owner.name if m.owner else None,
                owner_id=m.owner_id,
                target_date=m.target_date,
                status=m.status,
                depth=depth,
                parent_milestone_id=m.parent_milestone_id,
            )
        )
        result.extend(_flatten_tree(by_parent, str(m.id), depth + 1))
    return result


async def _load_project_milestones(project_id: uuid.UUID, db: AsyncSession) -> list[Milestone]:
    result = await db.execute(
        select(Milestone)
        .where(Milestone.project_id == project_id, Milestone.deleted_at.is_(None))
        .options(selectinload(Milestone.owner))
        .order_by(Milestone.sort_order, Milestone.created_at)
    )
    return list(result.scalars().all())


def _group_by_parent(milestones: list[Milestone]) -> dict[str | None, list[Milestone]]:
    by_parent: dict[str | None, list[Milestone]] = {}
    for m in milestones:
        key = str(m.parent_milestone_id) if m.parent_milestone_id else None
        by_parent.setdefault(key, []).append(m)
    return by_parent


async def _require_member(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this project")


async def _require_pm(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.role == "project_manager",
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Project manager role required")


async def create_milestone(
    project_id: uuid.UUID, data: MilestoneCreate, creator: UserOut, db: AsyncSession
) -> MilestoneOut:
    await _require_member(project_id, creator.id, db)

    if data.parent_milestone_id:
        parent_result = await db.execute(
            select(Milestone).where(
                Milestone.id == data.parent_milestone_id,
                Milestone.project_id == project_id,
                Milestone.deleted_at.is_(None),
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Parent milestone not found in this project")

    milestone = Milestone(
        id=uuid.uuid4(),
        project_id=project_id,
        owner_id=data.owner_id,
        title=data.title,
        description=data.description,
        target_date=data.target_date,
        status="pending",
        parent_milestone_id=data.parent_milestone_id,
        sort_order=data.sort_order or 0,
    )
    db.add(milestone)
    await db.flush()

    await log_action(
        db, creator.id, "milestone.created", "milestone", milestone.id,
        {"title": data.title, "project_id": str(project_id)},
    )

    owner_name = None
    if milestone.owner_id:
        from models.user import User
        user_result = await db.execute(select(User).where(User.id == milestone.owner_id))
        user = user_result.scalar_one_or_none()
        owner_name = user.name if user else None

    return MilestoneOut(
        id=milestone.id,
        title=milestone.title,
        description=milestone.description,
        status=milestone.status,
        target_date=milestone.target_date,
        owner_id=milestone.owner_id,
        owner_name=owner_name,
        project_id=milestone.project_id,
        parent_milestone_id=milestone.parent_milestone_id,
        sort_order=milestone.sort_order,
        created_at=milestone.created_at,
        children=[],
        days_until_due=_days_until(milestone.target_date),
    )


async def get_milestones(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> list[MilestoneOut]:
    await _require_member(project_id, user_id, db)
    milestones = await _load_project_milestones(project_id, db)
    by_parent = _group_by_parent(milestones)
    return _build_tree(by_parent, None)


async def get_milestone(milestone_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> MilestoneOut:
    result = await db.execute(
        select(Milestone)
        .where(Milestone.id == milestone_id, Milestone.deleted_at.is_(None))
        .options(selectinload(Milestone.owner))
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    await _require_member(milestone.project_id, user_id, db)

    milestones = await _load_project_milestones(milestone.project_id, db)
    by_parent = _group_by_parent(milestones)

    # Find the target in the flat list and return its subtree
    target = next((m for m in milestones if m.id == milestone_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Milestone not found")

    return MilestoneOut(
        id=target.id,
        title=target.title,
        description=target.description,
        status=target.status,
        target_date=target.target_date,
        owner_id=target.owner_id,
        owner_name=target.owner.name if target.owner else None,
        project_id=target.project_id,
        parent_milestone_id=target.parent_milestone_id,
        sort_order=target.sort_order,
        created_at=target.created_at,
        children=_build_tree(by_parent, str(milestone_id)),
        days_until_due=_days_until(target.target_date),
    )


async def update_milestone(
    milestone_id: uuid.UUID, data: MilestoneUpdate, user: UserOut, db: AsyncSession
) -> MilestoneOut:
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.deleted_at.is_(None))
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    await _require_member(milestone.project_id, user.id, db)

    updates_native = data.model_dump(exclude_unset=True)
    updates_json = data.model_dump(exclude_unset=True, mode='json')
    for field, value in updates_native.items():
        setattr(milestone, field, value)
    await db.flush()

    await log_action(db, user.id, "milestone.updated", "milestone", milestone_id, updates_json)
    return await get_milestone(milestone_id, user.id, db)


async def delete_milestone(milestone_id: uuid.UUID, user: UserOut, db: AsyncSession) -> None:
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.deleted_at.is_(None))
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    await _require_pm(milestone.project_id, user.id, db)

    # Load all project milestones to find descendants
    all_result = await db.execute(
        select(Milestone).where(
            Milestone.project_id == milestone.project_id,
            Milestone.deleted_at.is_(None),
        )
    )
    all_milestones = list(all_result.scalars().all())

    # Build children map and collect all descendants
    children_map: dict[str, list[Milestone]] = {}
    for m in all_milestones:
        if m.parent_milestone_id:
            children_map.setdefault(str(m.parent_milestone_id), []).append(m)

    to_delete = [milestone]
    queue = [milestone]
    while queue:
        current = queue.pop()
        for child in children_map.get(str(current.id), []):
            to_delete.append(child)
            queue.append(child)

    now = datetime.now(timezone.utc)
    for m in to_delete:
        m.deleted_at = now
    await db.flush()

    await log_action(
        db, user.id, "milestone.deleted", "milestone", milestone_id,
        {"cascade_count": len(to_delete) - 1},
    )


async def get_gantt_data(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> list[GanttItem]:
    await _require_member(project_id, user_id, db)
    milestones = await _load_project_milestones(project_id, db)
    by_parent = _group_by_parent(milestones)
    return _flatten_tree(by_parent, None, 0)
