"""
Literature Tracker — Step 3
Endpoints specifically for the reading workflow and Neo4j bridge.

POST   /literature/{paper_id}/status          → advance reading status
POST   /literature/bulk-status                → bulk status update
POST   /literature/{paper_id}/tags            → add tags
DELETE /literature/{paper_id}/tags/{tag}      → remove tag
POST   /literature/{paper_id}/session         → log reading time
GET    /literature/stats/{project_id}         → reading stats for a project
GET    /literature/graph-linked/{project_id}  → papers linked to graph nodes
GET    /literature/by-node/{neo4j_node_id}    → papers linked to a specific node
POST   /literature/{paper_id}/auto-link       → trigger NER-based auto-linking
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.auth import get_current_user_id
from api.core.database import get_db
from api.models.orm import Neo4jPaperLink, SavedPaper, ReadingStatus
from api.schemas.workspace import (
    BulkStatusUpdate, LiteratureStats, Neo4jLinkOut,
    ReadingSessionLog, SavedPaperOut, StatusUpdate,
)

router = APIRouter()

# Status transition rules: what can follow what
VALID_TRANSITIONS: dict[ReadingStatus, list[ReadingStatus]] = {
    ReadingStatus.unread:  [ReadingStatus.reading],
    ReadingStatus.reading: [ReadingStatus.done, ReadingStatus.unread],
    ReadingStatus.done:    [ReadingStatus.cited, ReadingStatus.reading],
    ReadingStatus.cited:   [ReadingStatus.done],
}


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


# ─── Status ───────────────────────────────────────────────────────────────────

@router.post("/{paper_id}/status", response_model=SavedPaperOut)
async def update_status(
    paper_id: UUID,
    body: StatusUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Advance reading status through the pipeline:
      unread → reading → done → cited
    Only valid transitions are allowed. Use force=true if you need to skip steps.
    """
    paper = await _get_paper_or_404(paper_id, user_id, db)
    allowed = VALID_TRANSITIONS.get(paper.status, [])
    if body.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from '{paper.status}' to '{body.status}'. "
                   f"Allowed: {[s.value for s in allowed]}",
        )
    paper.status = body.status
    await db.commit()
    await db.refresh(paper)
    return paper


@router.post("/{paper_id}/status/force", response_model=SavedPaperOut)
async def force_status(
    paper_id: UUID,
    body: StatusUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Force any status — skips transition rules. For corrections."""
    paper = await _get_paper_or_404(paper_id, user_id, db)
    paper.status = body.status
    await db.commit()
    await db.refresh(paper)
    return paper


@router.post("/bulk-status", response_model=dict)
async def bulk_status_update(
    body: BulkStatusUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-update status for multiple papers (no transition checks — direct set)."""
    from sqlalchemy import update as sa_update
    result = await db.execute(
        sa_update(SavedPaper)
        .where(
            SavedPaper.id.in_(body.paper_ids),
            SavedPaper.created_by == user_id,
            SavedPaper.deleted_at.is_(None),
        )
        .values(status=body.status, updated_at=datetime.now(timezone.utc))
        .returning(SavedPaper.id)
    )
    updated_ids = result.scalars().all()
    await db.commit()
    return {"updated": len(updated_ids), "ids": updated_ids}


# ─── Tags ─────────────────────────────────────────────────────────────────────

@router.post("/{paper_id}/tags/{tag}", response_model=SavedPaperOut)
async def add_tag(
    paper_id: UUID,
    tag: str,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = await _get_paper_or_404(paper_id, user_id, db)
    tag = tag.strip().lower()
    if tag not in paper.tags:
        paper.tags = paper.tags + [tag]
    await db.commit()
    await db.refresh(paper)
    return paper


@router.delete("/{paper_id}/tags/{tag}", response_model=SavedPaperOut)
async def remove_tag(
    paper_id: UUID,
    tag: str,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    paper = await _get_paper_or_404(paper_id, user_id, db)
    paper.tags = [t for t in paper.tags if t != tag]
    await db.commit()
    await db.refresh(paper)
    return paper


# ─── Reading session logging ──────────────────────────────────────────────────

@router.post("/{paper_id}/session", response_model=SavedPaperOut)
async def log_reading_session(
    paper_id: UUID,
    body: ReadingSessionLog,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Accumulate reading time (seconds). Called by the frontend when the reader
    tab loses focus or closes. Feeds Step-8 behavioural data asset.
    """
    paper = await _get_paper_or_404(paper_id, user_id, db)
    paper.time_spent_seconds += body.seconds
    paper.last_opened_at = datetime.now(timezone.utc)
    # Auto-promote to 'reading' if still unread and >= 30 sec
    if paper.status == ReadingStatus.unread and paper.time_spent_seconds >= 30:
        paper.status = ReadingStatus.reading
    await db.commit()
    await db.refresh(paper)
    return paper


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats/{project_id}", response_model=LiteratureStats)
async def get_literature_stats(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Reading pipeline stats for a project dashboard."""
    base = select(SavedPaper).where(
        SavedPaper.project_id == project_id,
        SavedPaper.created_by == user_id,
        SavedPaper.deleted_at.is_(None),
    )

    def count_status(s):
        return select(func.count()).select_from(SavedPaper).where(
            SavedPaper.project_id == project_id,
            SavedPaper.created_by == user_id,
            SavedPaper.deleted_at.is_(None),
            SavedPaper.status == s,
        )

    total    = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar()
    unread   = (await db.execute(count_status(ReadingStatus.unread))).scalar()
    reading  = (await db.execute(count_status(ReadingStatus.reading))).scalar()
    done     = (await db.execute(count_status(ReadingStatus.done))).scalar()
    cited    = (await db.execute(count_status(ReadingStatus.cited))).scalar()

    from sqlalchemy import cast, String as SAString
    tagged = (await db.execute(
        select(func.count()).select_from(SavedPaper).where(
            SavedPaper.project_id == project_id,
            SavedPaper.created_by == user_id,
            SavedPaper.deleted_at.is_(None),
            cast(SavedPaper.tags, SAString) != '[]',
        )
    )).scalar()

    linked = (await db.execute(
        select(func.count(func.distinct(Neo4jPaperLink.paper_id)))
        .join(SavedPaper, SavedPaper.id == Neo4jPaperLink.paper_id)
        .where(
            SavedPaper.project_id == project_id,
            SavedPaper.created_by == user_id,
            SavedPaper.deleted_at.is_(None),
        )
    )).scalar()

    return LiteratureStats(
        total=total or 0,
        unread=unread or 0,
        reading=reading or 0,
        done=done or 0,
        cited=cited or 0,
        tagged=tagged or 0,
        linked_to_graph=linked or 0,
    )


# ─── Graph-linked papers ──────────────────────────────────────────────────────

@router.get("/graph-linked/{project_id}", response_model=list[SavedPaperOut])
async def get_graph_linked_papers(
    project_id: UUID,
    node_type: str | None = None,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Papers in this project that have at least one Neo4j link.
    Optionally filter by node_type (Disease / Gene / Drug / ...).
    This is the Phase-1 ↔ Phase-2 bridge query.
    """
    q = (
        select(SavedPaper)
        .join(Neo4jPaperLink, Neo4jPaperLink.paper_id == SavedPaper.id)
        .where(
            SavedPaper.project_id == project_id,
            SavedPaper.created_by == user_id,
            SavedPaper.deleted_at.is_(None),
        )
        .distinct()
    )
    if node_type:
        q = q.where(Neo4jPaperLink.node_type == node_type)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/by-node/{neo4j_node_id}", response_model=list[SavedPaperOut])
async def get_papers_by_node(
    neo4j_node_id: str,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Given a Neo4j node ID (e.g. a Disease node), return all saved papers
    linked to it across ALL the user's projects.
    Called from Disease Explorer in Step-4 UI.
    """
    result = await db.execute(
        select(SavedPaper)
        .join(Neo4jPaperLink, Neo4jPaperLink.paper_id == SavedPaper.id)
        .where(
            Neo4jPaperLink.neo4j_node_id == neo4j_node_id,
            SavedPaper.created_by == user_id,
            SavedPaper.deleted_at.is_(None),
        )
        .order_by(SavedPaper.updated_at.desc())
    )
    return result.scalars().all()


# ─── Auto-link via NER (Step 3 bridge) ───────────────────────────────────────

@router.post("/{paper_id}/auto-link", response_model=list[Neo4jLinkOut])
async def auto_link_paper(
    paper_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger NER-based auto-linking: extract Disease/Gene/Drug entities from
    title + abstract and link them to Neo4j nodes.

    In production this delegates to the NLP service (spaCy + scispaCy).
    This stub returns the existing links so the endpoint is wired up and testable.
    """
    paper = await _get_paper_or_404(paper_id, user_id, db)
    text = f"{paper.title or ''} {paper.abstract or ''}"

    # ── Production: call NLP microservice ──────────────────────────────────
    # entities = await nlp_service.extract_entities(text)
    # for entity in entities:
    #     neo4j_id = await neo4j_service.find_node(entity.label, entity.type)
    #     if neo4j_id:
    #         link = Neo4jPaperLink(
    #             paper_id=paper_id,
    #             neo4j_node_id=neo4j_id,
    #             node_type=entity.type,
    #             node_label=entity.label,
    #             link_source="auto_ner",
    #             confidence=entity.confidence,
    #         )
    #         db.add(link)
    # await db.commit()
    # ───────────────────────────────────────────────────────────────────────

    # Return existing links for now
    result = await db.execute(
        select(Neo4jPaperLink).where(Neo4jPaperLink.paper_id == paper_id)
    )
    return result.scalars().all()
