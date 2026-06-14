from typing import Literal

from pydantic import BaseModel, EmailStr


class ShareRequest(BaseModel):
    recipient_email: EmailStr
    message: str | None = None


class ProjectShareRequest(ShareRequest):
    access_type: Literal['view', 'edit'] = 'edit'


class MilestoneShareRequest(ShareRequest):
    access_type: Literal['view', 'edit'] = 'view'


class ShareErrorCode(BaseModel):
    error_code: str


class ShareErrorDetail(BaseModel):
    error_code: str


class ShareResponse(BaseModel):
    sent: bool = True
