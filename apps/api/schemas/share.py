from pydantic import BaseModel, EmailStr


class ShareRequest(BaseModel):
    recipient_email: EmailStr
    message: str | None = None


class ShareResponse(BaseModel):
    sent: bool = True
