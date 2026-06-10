"""
Saved Papers — core CRUD (Step 2) + Neo4j linking (Step 3).

POST   /saved-papers                  → save a paper to a project
GET    /saved-papers/project/{id}     → list papers in a project
GET    /saved-papers/{id}             → get one
PATCH  /saved-papers/{id}             → update metadata / status / tags
DELETE /saved-papers/{id}             → soft-delete
POST   /saved-papers/{id}/move-collection  → move to different collection
POST   /saved-papers/{id}/move-folder      → move to different folder
POST   /saved-papers/{id}/neo4j-links      → link to Neo4j node  (Step 3)
GET    /saved-papers/{id}/neo4j-links      → list graph links
DELETE /saved-papers/{id}/neo4j-links/{link_id}  → remove link
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.auth import get_current_user_id
from api.core.database import get_db
from api.models.orm import Neo4jPaperLink, PaperCollectionMembership, SavedPaper
from api.schemas.workspace import (
    MoveToCollection, MoveToFolder,
    Neo4jLinkCreate, Neo4jLinkOut,
    SavedPaperOut, SavedPaperUpdate, SavePaperRequest,
)

router = APIRouter()


async def _get_paper_or_404(paper_id: UUID, user_id: UUID, db: AsyncSession) -> SavedPaper:
    result = await db.execute(
        select(SavedPaper).where(
            SavedPaper.id == paper_id,
            SavedPaper.deleted_at.is_(None),
        )
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.created_by != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return paper


# ─── Save ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=SavedPaperOut, status_code=status.HTTP_201_CREATED)
async def save_paper(
    body: SavePaperRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = SavedPaper(**body.model_dump(), created_by=user_id)
    db.add(paper)
    await db.flush()

    # Auto-create collection membership if collection_id supplied
    if body.collection_id:
        db.add(PaperCollectionMembership(
            paper_id=paper.id,
            collection_id=body.collection_id,
            added_by=user_id,
        ))

    await db.commit()
    await db.refresh(paper)
    return paper


# ─── List ─────────────────────────────────────────────────────────────────────

@router.get("/project/{project_id}", response_model=list[SavedPaperOut])
async def list_papers(
    project_id: UUID,
    collection_id: UUID | None = None,
    folder_id:     UUID | None = None,
    status_filter: str | None = Query(None, alias="status"),
    tag:           str | None = None,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import any_
    q = select(SavedPaper).where(
        SavedPaper.project_id == project_id,
        SavedPaper.created_by == user_id,
        SavedPaper.deleted_at.is_(None),
    )
    if collection_id:
        q = q.where(SavedPaper.collection_id == collection_id)
    if folder_id:
        q = q.where(SavedPaper.folder_id == folder_id)
    if status_filter:
        q = q.where(SavedPaper.status == status_filter)
    if tag:
        q = q.where(SavedPaper.tags.any(tag))
    result = await db.execute(q.order_by(SavedPaper.position, SavedPaper.created_at.desc()))
    return result.scalars().all()


# ─── Get one ──────────────────────────────────────────────────────────────────

@router.get("/{paper_id}", response_model=SavedPaperOut)
async def get_paper(
    paper_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = await _get_paper_or_404(paper_id, user_id, db)
    # Record open
    paper.open_count += 1
    paper.last_opened_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(paper)
    return paper


# ─── Update ───────────────────────────────────────────────────────────────────

@router.patch("/{paper_id}", response_model=SavedPaperOut)
async def update_paper(
    paper_id: UUID,
    body: SavedPaperUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = await _get_paper_or_404(paper_id, user_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(paper, field, value)
    await db.commit()
    await db.refresh(paper)
    return paper


# ─── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(
    paper_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = await _get_paper_or_404(paper_id, user_id, db)
    paper.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ─── Move ─────────────────────────────────────────────────────────────────────

@router.post("/{paper_id}/move-collection", response_model=SavedPaperOut)
async def move_to_collection(
    paper_id: UUID,
    body: MoveToCollection,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = await _get_paper_or_404(paper_id, user_id, db)
    paper.collection_id = body.collection_id

    # Upsert membership
    existing = await db.execute(
        select(PaperCollectionMembership).where(
            PaperCollectionMembership.paper_id == paper_id,
            PaperCollectionMembership.collection_id == body.collection_id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(PaperCollectionMembership(
            paper_id=paper_id,
            collection_id=body.collection_id,
            added_by=user_id,
        ))
    await db.commit()
    await db.refresh(paper)
    return paper


@router.post("/{paper_id}/move-folder", response_model=SavedPaperOut)
async def move_to_folder(
    paper_id: UUID,
    body: MoveToFolder,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = await _get_paper_or_404(paper_id, user_id, db)
    paper.folder_id = body.folder_id
    await db.commit()
    await db.refresh(paper)
    return paper


# ─── Neo4j links (Step 3) ─────────────────────────────────────────────────────

@router.post("/{paper_id}/neo4j-links", response_model=Neo4jLinkOut, status_code=status.HTTP_201_CREATED)
async def add_neo4j_link(
    paper_id: UUID,
    body: Neo4jLinkCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Link a saved paper to a node in the Phase-1 Neo4j knowledge graph."""
    await _get_paper_or_404(paper_id, user_id, db)

    # Check for duplicate
    existing = await db.execute(
        select(Neo4jPaperLink).where(
            Neo4jPaperLink.paper_id == paper_id,
            Neo4jPaperLink.neo4j_node_id == body.neo4j_node_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Link already exists")

    link = Neo4jPaperLink(**body.model_dump(), paper_id=paper_id)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.get("/{paper_id}/neo4j-links", response_model=list[Neo4jLinkOut])
async def list_neo4j_links(
    paper_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _get_paper_or_404(paper_id, user_id, db)
    result = await db.execute(
        select(Neo4jPaperLink)
        .where(Neo4jPaperLink.paper_id == paper_id)
        .order_by(Neo4jPaperLink.created_at)
    )
    return result.scalars().all()


@router.delete("/{paper_id}/neo4j-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_neo4j_link(
    paper_id: UUID,
    link_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _get_paper_or_404(paper_id, user_id, db)
    result = await db.execute(
        select(Neo4jPaperLink).where(
            Neo4jPaperLink.id == link_id,
            Neo4jPaperLink.paper_id == paper_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    await db.delete(link)
    await db.commit()
