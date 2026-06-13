"""
api/collaboration.py

Step 7 — Collaboration Layer
All routes mount under /api/v1
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_db
from ..models import (
    ActivityEvent,
    Comment,
    PaperAssignment,
    ProjectInvitation,
    ProjectMember,
    User,
)
from ..schemas.collaboration import (
    ActivityFeedOut,
    AddCommentRequest,
    AssignPaperRequest,
    AssignmentOut,
    CommentOut,
    EditCommentRequest,
    InviteMemberRequest,
    MemberOut,
    UpdateAssignmentStatusRequest,
    UpdateMemberRoleRequest,
    WSMessage,
)
from ..websockets.manager import manager
from .deps import get_current_user, require_project_role

router = APIRouter(tags=["collaboration"])

# ── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/ws/projects/{project_id}")
async def project_websocket(
    project_id: UUID,
    websocket: WebSocket,
    # token: str = Query(...),  # uncomment + validate JWT for production
):
    await manager.connect(project_id, websocket)
    try:
        while True:
            # Keep alive; client can also send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)


# ── Members ──────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/members", response_model=list[MemberOut])
async def list_members(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_role(db, project_id, current_user.id, ["owner", "editor", "viewer"])
    rows = await db.execute(
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at)
    )
    members = []
    for pm, user in rows.all():
        members.append(
            MemberOut(
                id=pm.id,
                user_id=user.id,
                display_name=user.display_name,
                email=user.email,
                avatar_url=user.avatar_url,
                role=pm.role,
                invited_by=pm.invited_by,
                created_at=pm.created_at,
            )
        )
    return members


@router.post("/projects/{project_id}/members", status_code=status.HTTP_201_CREATED)
async def invite_member(
    project_id: UUID,
    body: InviteMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_role(db, project_id, current_user.id, ["owner"])

    # Create invitation token
    token = secrets.token_urlsafe(48)
    inv = ProjectInvitation(
        project_id=project_id,
        email=body.email,
        role=body.role,
        token=token,
        invited_by=current_user.id,
    )
    db.add(inv)
    await db.commit()

    # TODO: send invitation email with token link
    # email_service.send_invite(body.email, token, project_id)

    await _log_activity(db, project_id, current_user.id, "member_invited", "invitation", inv.id, {"email": body.email, "role": body.role})
    await manager.broadcast(project_id, WSMessage(type="member_joined", project_id=project_id, actor_id=current_user.id, payload={"email": body.email}).model_dump())
    return {"message": "Invitation sent", "invitation_id": inv.id}


@router.patch("/projects/{project_id}/members/{user_id}")
async def update_member_role(
    project_id: UUID,
    user_id: UUID,
    body: UpdateMemberRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_role(db, project_id, current_user.id, ["owner"])
    await db.execute(
        update(ProjectMember)
        .where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .values(role=body.role)
    )
    await db.commit()
    return {"message": "Role updated"}


@router.delete("/projects/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_role(db, project_id, current_user.id, ["owner"])
    await db.execute(
        delete(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    await db.commit()
    await manager.broadcast(project_id, WSMessage(type="member_removed", project_id=project_id, actor_id=current_user.id, payload={"user_id": str(user_id)}).model_dump())


# ── Invite Acceptance ────────────────────────────────────────────────────────

@router.post("/invitations/{token}/accept")
async def accept_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.token == token,
            ProjectInvitation.accepted_at.is_(None),
            ProjectInvitation.expires_at > datetime.now(timezone.utc),
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")

    # Add member
    member = ProjectMember(
        project_id=inv.project_id,
        user_id=current_user.id,
        role=inv.role,
        invited_by=inv.invited_by,
    )
    db.add(member)
    inv.accepted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Joined project", "project_id": inv.project_id, "role": inv.role}


# ── Paper Assignments ────────────────────────────────────────────────────────

@router.post("/papers/{paper_id}/assign", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def assign_paper(
    paper_id: UUID,
    body: AssignPaperRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = PaperAssignment(
        paper_id=paper_id,
        assigned_to=body.user_id,
        assigned_by=current_user.id,
        note=body.note,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    # Resolve which project this paper belongs to for the WS broadcast
    project_id = await _get_paper_project(db, paper_id)
    if project_id:
        await _log_activity(db, project_id, current_user.id, "paper_assigned", "paper", paper_id, {"assigned_to": str(body.user_id)})
        await manager.broadcast(project_id, WSMessage(type="paper_assigned", project_id=project_id, actor_id=current_user.id, payload={"paper_id": str(paper_id), "assigned_to": str(body.user_id)}).model_dump())

    return assignment


@router.patch("/assignments/{assignment_id}")
async def update_assignment_status(
    assignment_id: UUID,
    body: UpdateAssignmentStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(PaperAssignment)
        .where(PaperAssignment.id == assignment_id)
        .values(status=body.status)
    )
    await db.commit()
    return {"message": "Status updated"}


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/notes/{note_id}/comments", response_model=list[CommentOut])
async def list_comments(
    note_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await db.execute(
        select(Comment, User)
        .join(User, User.id == Comment.user_id)
        .where(Comment.note_id == note_id, Comment.parent_comment_id.is_(None))
        .order_by(Comment.created_at)
    )
    # Build threaded tree (two-pass)
    top_level = []
    for comment, user in rows.all():
        replies = await _get_replies(db, comment.id)
        top_level.append(_to_comment_out(comment, user, replies))
    return top_level


@router.post("/notes/{note_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    note_id: UUID,
    body: AddCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = Comment(
        note_id=note_id,
        user_id=current_user.id,
        content=body.content,
        parent_comment_id=body.parent_comment_id,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    project_id = await _get_note_project(db, note_id)
    if project_id:
        await _log_activity(db, project_id, current_user.id, "comment_added", "note", note_id, {"comment_id": str(comment.id)})
        await manager.broadcast(project_id, WSMessage(type="comment_created", project_id=project_id, actor_id=current_user.id, payload={"comment_id": str(comment.id), "note_id": str(note_id), "content": body.content[:100]}).model_dump())

    return _to_comment_out(comment, current_user, [])


@router.patch("/comments/{comment_id}")
async def edit_comment(
    comment_id: UUID,
    body: EditCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(Comment)
        .where(Comment.id == comment_id, Comment.user_id == current_user.id)
        .values(content=body.content, edited_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"message": "Comment updated"}


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(Comment).where(Comment.id == comment_id, Comment.user_id == current_user.id)
    )
    await db.commit()


# ── Activity Feed ─────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/activity", response_model=ActivityFeedOut)
async def get_activity_feed(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_role(db, project_id, current_user.id, ["owner", "editor", "viewer"])
    offset = (page - 1) * page_size

    rows = await db.execute(
        select(ActivityEvent, User)
        .join(User, User.id == ActivityEvent.user_id, isouter=True)
        .where(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(page_size)
        .offset(offset)
    )

    from ..schemas.collaboration import ActivityEventOut, CommentAuthor
    events = []
    for ev, user in rows.all():
        events.append(ActivityEventOut(
            id=ev.id,
            event_type=ev.event_type,
            target_type=ev.target_type,
            target_id=ev.target_id,
            metadata=ev.metadata or {},
            actor=CommentAuthor(id=user.id, display_name=user.display_name, avatar_url=user.avatar_url) if user else CommentAuthor(id=ev.user_id, display_name="Unknown"),
            created_at=ev.created_at,
        ))

    total_result = await db.execute(
        select(ActivityEvent).where(ActivityEvent.project_id == project_id)
    )
    total = len(total_result.all())
    return ActivityFeedOut(events=events, total=total, page=page, page_size=page_size)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _log_activity(db, project_id, user_id, event_type, target_type, target_id, metadata):
    ev = ActivityEvent(
        project_id=project_id,
        user_id=user_id,
        event_type=event_type,
        target_type=target_type,
        target_id=target_id,
        metadata=metadata,
    )
    db.add(ev)
    await db.commit()


async def _get_replies(db: AsyncSession, comment_id: UUID) -> list[CommentOut]:
    rows = await db.execute(
        select(Comment, User)
        .join(User, User.id == Comment.user_id)
        .where(Comment.parent_comment_id == comment_id)
        .order_by(Comment.created_at)
    )
    return [_to_comment_out(c, u, []) for c, u in rows.all()]


def _to_comment_out(comment, user, replies) -> CommentOut:
    from ..schemas.collaboration import CommentAuthor
    return CommentOut(
        id=comment.id,
        content=comment.content,
        user_id=comment.user_id,
        author=CommentAuthor(id=user.id, display_name=user.display_name, avatar_url=getattr(user, "avatar_url", None)),
        parent_comment_id=comment.parent_comment_id,
        replies=replies,
        created_at=comment.created_at,
        edited_at=comment.edited_at,
    )


async def _get_paper_project(db: AsyncSession, paper_id: UUID):
    from ..models import SavedPaper
    result = await db.execute(select(SavedPaper.project_id).where(SavedPaper.id == paper_id))
    row = result.scalar_one_or_none()
    return row


async def _get_note_project(db: AsyncSession, note_id: UUID):
    from ..models import Note
    result = await db.execute(select(Note.project_id).where(Note.id == note_id))
    row = result.scalar_one_or_none()
    return row
