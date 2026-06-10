from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.auth import get_current_user_id
from api.core.database import get_db
from api.models.orm import Note
from api.schemas.workspace import NoteCreate, NoteUpdate, NoteOut

router = APIRouter()

@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    note = Note(**body.model_dump(), created_by=user_id)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note

@router.get("/project/{project_id}", response_model=list[NoteOut])
async def list_notes(
    project_id: UUID,
    paper_id: UUID | None = None,
    collection_id: UUID | None = None,
    folder_id: UUID | None = None,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    q = select(Note).where(
        Note.project_id == project_id,
        Note.created_by == user_id,
        Note.deleted_at.is_(None)
    )
    if paper_id:
        q = q.where(Note.paper_id == paper_id)
    if collection_id:
        q = q.where(Note.collection_id == collection_id)
    if folder_id:
        q = q.where(Note.folder_id == folder_id)

    result = await db.execute(q.order_by(Note.created_at.desc()))
    return result.scalars().all()

@router.patch("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: UUID,
    body: NoteUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(
            Note.id == note_id,
            Note.created_by == user_id,
            Note.deleted_at.is_(None)
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    
    await db.commit()
    await db.refresh(note)
    return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(
            Note.id == note_id,
            Note.created_by == user_id,
            Note.deleted_at.is_(None)
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    note.deleted_at = datetime.now(timezone.utc)
    await db.commit()
