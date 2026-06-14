import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    status: str
    owner_id: uuid.UUID
    created_at: datetime
    member_count: int
    milestone_count: int
    model_config = {"from_attributes": True}


class ProjectSummary(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    owner_id: uuid.UUID
    created_at: datetime
    member_count: int
    next_milestone_date: Optional[date]

    model_config = {"from_attributes": True}


class ProjectPublic(BaseModel):
    id: uuid.UUID
    name: str
    owner_name: str


class ProjectMemberOut(BaseModel):
    user_id: uuid.UUID
    name: str
    email: str
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class UpdateMemberRoleRequest(BaseModel):
    role: str
