import base64
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.milestone import Milestone
from models.milestone_share import MilestoneShare
from models.project import Project, ProjectMember
from models.project_invite import ProjectInvite
from models.user import User
from models.user_integration import UserIntegration

GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


async def _get_valid_integration(user_id: uuid.UUID, db: AsyncSession) -> UserIntegration:
    result = await db.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == user_id,
            UserIntegration.provider == "google",
        )
    )
    integration = result.scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=422, detail={"error_code": "google_not_connected"})

    now = datetime.now(timezone.utc)
    if integration.token_expiry and integration.token_expiry <= now:
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                GOOGLE_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "refresh_token": integration.refresh_token,
                },
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=422, detail={"error_code": "google_token_refresh_failed"})
        token_data = resp.json()
        integration.access_token = token_data["access_token"]
        integration.token_expiry = now + timedelta(seconds=token_data.get("expires_in", 3600))
        integration.updated_at = now
        await db.flush()

    if not integration.scope or GMAIL_SCOPE not in integration.scope:
        raise HTTPException(status_code=422, detail={"error_code": "gmail_scope_missing"})

    return integration


async def _send_via_gmail(
    access_token: str,
    sender_name: str,
    sender_email: str,
    recipient_email: str,
    subject: str,
    html_body: str,
    plain_body: str,
) -> None:
    msg = EmailMessage()
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.set_content(plain_body)
    msg.add_alternative(html_body, subtype="html")

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    async with httpx.AsyncClient() as http:
        resp = await http.post(
            GMAIL_SEND_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            json={"raw": raw},
        )

    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail="Gmail API error")


def _html_wrapper(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px;">
        <tr>
          <td style="background:#0f1b2d;padding:20px 32px;">
            <span style="color:#f59e0b;font-size:18px;font-weight:bold;letter-spacing:0.05em;">Meridian</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 20px;color:#111827;font-size:18px;">{title}</h2>
            {body_html}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Sent via Meridian</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _status_badge(status: str) -> str:
    colors = {
        "active": "#d97706",
        "pending": "#6b7280",
        "in_progress": "#d97706",
        "complete": "#16a34a",
        "archived": "#6b7280",
    }
    color = colors.get(status, "#6b7280")
    return (
        f'<span style="display:inline-block;padding:2px 10px;border-radius:9999px;'
        f'background:{color}22;color:{color};font-size:12px;font-weight:600;">'
        f"{status.replace('_', ' ').title()}</span>"
    )


async def share_project(
    project_id: uuid.UUID,
    sender_id: uuid.UUID,
    recipient_email: str,
    access_type: str,
    message: str | None,
    db: AsyncSession,
) -> None:
    project_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == sender_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this project")
    if member.role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot share projects")

    sender_result = await db.execute(select(User).where(User.id == sender_id))
    sender = sender_result.scalar_one()

    integration = await _get_valid_integration(sender_id, db)

    subject = f"{sender.name} shared a project with you — {project.name}"

    desc_html = ""
    desc_plain = ""
    if project.description:
        desc_html = f'<p style="margin:12px 0 0;color:#374151;font-size:14px;">{project.description}</p>'
        desc_plain = f"\n{project.description}"

    message_html = ""
    message_plain = ""
    if message:
        message_html = (
            f'<div style="margin:20px 0 0;padding:16px;background:#f9fafb;border-left:3px solid #f59e0b;border-radius:4px;">'
            f'<p style="margin:0;color:#374151;font-size:14px;font-style:italic;">{message}</p>'
            f"</div>"
        )
        message_plain = f'\n\n"{message}"'

    join_url = f"{settings.frontend_url}/join/{project_id}"

    body_html = f"""
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:0;margin-bottom:16px;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;">{project.name}</p>
          {_status_badge(project.status)}
          {desc_html}
        </td></tr>
      </table>
      {message_html}
      <p style="margin:24px 0 0;">
        <a href="{join_url}"
           style="display:inline-block;padding:10px 20px;background:#f59e0b;color:#000;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">
          Join project
        </a>
      </p>
    """

    plain_body = (
        f"{sender.name} shared a project with you: {project.name}\n"
        f"Status: {project.status}{desc_plain}{message_plain}\n\n"
        f"Join this project: {join_url}"
    )

    await _send_via_gmail(
        access_token=integration.access_token,
        sender_name=sender.name,
        sender_email=integration.email or sender.email,
        recipient_email=recipient_email,
        subject=subject,
        html_body=_html_wrapper(subject, body_html),
        plain_body=plain_body,
    )

    invite_role = "viewer" if access_type == "view" else "member"
    stmt = pg_insert(ProjectInvite).values(
        id=uuid.uuid4(),
        project_id=project_id,
        invited_email=recipient_email,
        invited_by_id=sender_id,
        role=invite_role,
        status="pending",
    ).on_conflict_do_update(
        constraint="uq_project_invites_project_email",
        set_={"status": "pending", "role": invite_role, "invited_by_id": sender_id},
    )
    await db.execute(stmt)
    await db.flush()


def _access_badge(access_type: str) -> str:
    if access_type == 'edit':
        color = "#d97706"
        label = "Edit access"
    else:
        color = "#6b7280"
        label = "View only"
    return (
        f'<span style="display:inline-block;padding:2px 10px;border-radius:9999px;'
        f'background:{color}22;color:{color};font-size:12px;font-weight:600;">'
        f"{label}</span>"
    )


async def share_milestone(
    milestone_id: uuid.UUID,
    sender_id: uuid.UUID,
    recipient_email: str,
    access_type: str,
    message: str | None,
    db: AsyncSession,
) -> None:
    milestone_result = await db.execute(
        select(Milestone, Project.name.label("project_name"))
        .join(Project, Milestone.project_id == Project.id)
        .where(Milestone.id == milestone_id, Milestone.deleted_at.is_(None))
    )
    row = milestone_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Milestone not found")
    milestone, project_name = row.Milestone, row.project_name

    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == milestone.project_id,
            ProjectMember.user_id == sender_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this project")
    if member.role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot share milestones")

    sender_result = await db.execute(select(User).where(User.id == sender_id))
    sender = sender_result.scalar_one()

    # Resolve recipient user id if they already have an account
    recipient_result = await db.execute(select(User).where(User.email == recipient_email))
    recipient_user = recipient_result.scalar_one_or_none()

    # Upsert share record
    stmt = pg_insert(MilestoneShare).values(
        id=uuid.uuid4(),
        milestone_id=milestone_id,
        shared_with_email=recipient_email,
        shared_with_id=recipient_user.id if recipient_user else None,
        access_type=access_type,
        granted_by_id=sender_id,
    ).on_conflict_do_update(
        constraint="uq_milestone_shares_milestone_email",
        set_={
            "access_type": access_type,
            "granted_by_id": sender_id,
            "shared_with_id": recipient_user.id if recipient_user else None,
            "created_at": datetime.now(timezone.utc),
        },
    )
    await db.execute(stmt)
    await db.flush()

    # Auto-grant viewer access to the parent project if not already a member
    if recipient_user:
        existing_member = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == milestone.project_id,
                ProjectMember.user_id == recipient_user.id,
            )
        )
        if not existing_member.scalar_one_or_none():
            db.add(ProjectMember(
                id=uuid.uuid4(),
                project_id=milestone.project_id,
                user_id=recipient_user.id,
                role="viewer",
            ))
            invite_stmt = pg_insert(ProjectInvite).values(
                id=uuid.uuid4(),
                project_id=milestone.project_id,
                invited_email=recipient_email,
                invited_by_id=sender_id,
                role="viewer",
                status="accepted",
            ).on_conflict_do_update(
                constraint="uq_project_invites_project_email",
                set_={"status": "accepted", "role": "viewer"},
            )
            await db.execute(invite_stmt)
            await db.flush()
    else:
        invite_stmt = pg_insert(ProjectInvite).values(
            id=uuid.uuid4(),
            project_id=milestone.project_id,
            invited_email=recipient_email,
            invited_by_id=sender_id,
            role="viewer",
            status="pending",
        ).on_conflict_do_update(
            constraint="uq_project_invites_project_email",
            set_={"status": "pending", "role": "viewer"},
        )
        await db.execute(invite_stmt)
        await db.flush()

    integration = await _get_valid_integration(sender_id, db)

    access_label = "edit" if access_type == "edit" else "view"
    subject = f"{sender.name} shared a milestone with you — {milestone.title}"

    desc_html = ""
    desc_plain = ""
    if milestone.description:
        desc_html = f'<p style="margin:12px 0 0;color:#374151;font-size:14px;">{milestone.description}</p>'
        desc_plain = f"\n{milestone.description}"

    date_html = ""
    date_plain = ""
    if milestone.target_date:
        formatted = milestone.target_date.strftime("%-d %b %Y")
        date_html = f'<p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Due: {formatted}</p>'
        date_plain = f"\nDue: {formatted}"

    message_html = ""
    message_plain = ""
    if message:
        message_html = (
            f'<div style="margin:20px 0 0;padding:16px;background:#f9fafb;border-left:3px solid #f59e0b;border-radius:4px;">'
            f'<p style="margin:0;color:#374151;font-size:14px;font-style:italic;">{message}</p>'
            f"</div>"
        )
        message_plain = f'\n\n"{message}"'

    milestone_url = f"{settings.frontend_url}/projects/{milestone.project_id}"

    body_html = f"""
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:0;margin-bottom:16px;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Project: {project_name}</p>
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;">{milestone.title}</p>
          {_status_badge(milestone.status)}
          &nbsp;
          {_access_badge(access_type)}
          {desc_html}
          {date_html}
        </td></tr>
      </table>
      {message_html}
      <p style="margin:24px 0 0;">
        <a href="{milestone_url}"
           style="display:inline-block;padding:10px 20px;background:#f59e0b;color:#000;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">
          View milestone
        </a>
      </p>
    """

    plain_body = (
        f"{sender.name} shared a milestone with you: {milestone.title}\n"
        f"Project: {project_name}\n"
        f"Access: {access_label}\n"
        f"Status: {milestone.status}{desc_plain}{date_plain}{message_plain}\n\n"
        f"View milestone: {milestone_url}"
    )

    await _send_via_gmail(
        access_token=integration.access_token,
        sender_name=sender.name,
        sender_email=integration.email or sender.email,
        recipient_email=recipient_email,
        subject=subject,
        html_body=_html_wrapper(subject, body_html),
        plain_body=plain_body,
    )
