import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    target_date: Optional[date] = None
    parent_milestone_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = 0


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    target_date: Optional[date] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None


class MilestoneOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    target_date: Optional[date]
    owner_id: Optional[uuid.UUID]
    owner_name: Optional[str]
    project_id: uuid.UUID
    parent_milestone_id: Optional[uuid.UUID]
    sort_order: int
    created_at: datetime
    children: list["MilestoneOut"] = []
    days_until_due: Optional[int]
    user_access: str = 'view'

    model_config = ConfigDict(from_attributes=True)


MilestoneOut.model_rebuild()


class GanttItem(BaseModel):
    id: uuid.UUID
    title: str
    owner_name: Optional[str]
    owner_id: Optional[uuid.UUID]
    target_date: Optional[date]
    status: str
    depth: int
    parent_milestone_id: Optional[uuid.UUID]
