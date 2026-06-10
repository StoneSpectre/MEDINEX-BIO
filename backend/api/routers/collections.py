from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.auth import get_current_user_id
from api.core.database import get_db
from api.models.orm import Collection
from api.schemas.workspace import CollectionCreate, CollectionUpdate, CollectionOut

router = APIRouter()

@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
async def create_collection(
    body: CollectionCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    collection = Collection(**body.model_dump(), created_by=user_id)
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    return collection

@router.get("/project/{project_id}", response_model=list[CollectionOut])
async def list_collections(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Collection)
        .where(
            Collection.project_id == project_id,
            Collection.created_by == user_id,
            Collection.deleted_at.is_(None)
        )
        .order_by(Collection.created_at.desc())
    )
    return result.scalars().all()

@router.patch("/{collection_id}", response_model=CollectionOut)
async def update_collection(
    collection_id: UUID,
    body: CollectionUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.created_by == user_id,
            Collection.deleted_at.is_(None)
        )
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(collection, field, value)
    
    await db.commit()
    await db.refresh(collection)
    return collection

@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.created_by == user_id,
            Collection.deleted_at.is_(None)
        )
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    collection.deleted_at = datetime.now(timezone.utc)
    await db.commit()
