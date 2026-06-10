from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.auth import get_current_user_id
from api.core.database import get_db
from api.models.orm import Folder
from api.schemas.workspace import FolderCreate, FolderUpdate, FolderOut

router = APIRouter()

@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    body: FolderCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    folder = Folder(**body.model_dump(), created_by=user_id)
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder

@router.get("/project/{project_id}", response_model=list[FolderOut])
async def list_folders(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder)
        .where(
            Folder.project_id == project_id,
            Folder.created_by == user_id,
            Folder.deleted_at.is_(None)
        )
        .order_by(Folder.position, Folder.created_at.desc())
    )
    return result.scalars().all()

@router.patch("/{folder_id}", response_model=FolderOut)
async def update_folder(
    folder_id: UUID,
    body: FolderUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.created_by == user_id,
            Folder.deleted_at.is_(None)
        )
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(folder, field, value)
    
    await db.commit()
    await db.refresh(folder)
    return folder

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.created_by == user_id,
            Folder.deleted_at.is_(None)
        )
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    folder.deleted_at = datetime.now(timezone.utc)
    await db.commit()
