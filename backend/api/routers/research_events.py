"""
api/research_events.py

Step 8 — Research Workflow Data Asset
Routes for event capture, analytics, and co-save recommendations.
"""
from __future__ import annotations

import itertools
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_db
from ..models import PaperCoSave, PaperAnalytic, ResearchEvent, TopicAnalytic, TrendAnalytic
from ..schemas.research_events import (
    AnalyticsDashboard,
    CoSaveRecommendations,
    PaperStat,
    RelatedPaper,
    TopicStat,
    TrackEventRequest,
    TrackEventResponse,
    TrendStat,
)
from .deps import get_current_user_optional

router = APIRouter(tags=["research-events"])


# ── Event Tracking ────────────────────────────────────────────────────────────

@router.post("/events/track", response_model=TrackEventResponse)
async def track_event(
    body: TrackEventRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    Fire-and-forget event capture called by the frontend.
    Should complete in < 10 ms (single INSERT).
    """
    event = ResearchEvent(
        user_id=current_user.id if current_user else None,
        project_id=body.project_id,
        session_id=body.session_id,
        event_type=body.event_type,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        metadata=body.metadata,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Side-effect: update co-save graph when a paper is saved to a collection
    if body.event_type == "paper_saved" and body.project_id:
        await _update_co_save_graph(db, body.entity_id, body.project_id, current_user)

    return TrackEventResponse(recorded=True, event_id=event.id)


# ── Analytics Dashboard ───────────────────────────────────────────────────────

@router.get("/analytics/dashboard", response_model=AnalyticsDashboard)
async def get_dashboard(
    project_id: Optional[UUID] = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    since = date.today() - timedelta(days=days)

    # Popular topics
    topic_rows = await db.execute(
        select(TopicAnalytic)
        .where(TopicAnalytic.period_date >= since)
        .order_by(TopicAnalytic.search_count.desc())
        .limit(10)
    )
    popular_topics = [TopicStat(
        topic=r.topic,
        search_count=r.search_count,
        view_count=r.view_count,
        save_count=r.save_count,
        period_date=r.period_date,
    ) for r in topic_rows.scalars()]

    # Popular papers
    paper_rows = await db.execute(
        select(PaperAnalytic)
        .where(PaperAnalytic.period_date >= since)
        .order_by(PaperAnalytic.view_count.desc())
        .limit(10)
    )
    popular_papers = [PaperStat(
        pmid=r.pmid,
        view_count=r.view_count,
        save_count=r.save_count,
        review_count=r.review_count,
        avg_time_on_paper_seconds=r.avg_time_on_paper_seconds,
        period_date=r.period_date,
    ) for r in paper_rows.scalars()]

    # Emerging topics
    trend_rows = await db.execute(
        select(TrendAnalytic)
        .where(TrendAnalytic.period_date >= since)
        .order_by(TrendAnalytic.velocity_score.desc())
        .limit(10)
    )
    emerging_topics = [TrendStat(
        topic=r.topic,
        velocity_score=r.velocity_score,
        baseline_count=r.baseline_count,
        recent_count=r.recent_count,
        period_date=r.period_date,
    ) for r in trend_rows.scalars()]

    return AnalyticsDashboard(
        popular_topics=popular_topics,
        popular_papers=popular_papers,
        emerging_topics=emerging_topics,
        generated_at=datetime.now(timezone.utc),
    )


# ── Co-Save Recommendations ───────────────────────────────────────────────────

@router.get("/papers/{pmid}/related", response_model=CoSaveRecommendations)
async def get_related_papers(
    pmid: str,
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns papers co-saved most frequently with the given PMID.
    Uses the paper_co_saves graph table populated by track_event().
    """
    # Look up entity_id for this pmid
    result = await db.execute(
        select(ResearchEvent.entity_id)
        .where(
            ResearchEvent.event_type == "paper_saved",
            ResearchEvent.metadata["pmid"].astext == pmid,
        )
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        return CoSaveRecommendations(source_pmid=pmid, related=[])

    paper_uuid = row

    # Find co-saved papers (paper can appear as either A or B)
    rows = await db.execute(
        text("""
            SELECT
                CASE WHEN paper_id_a = :pid THEN paper_id_b ELSE paper_id_a END AS related_id,
                SUM(co_save_count) AS strength
            FROM paper_co_saves
            WHERE paper_id_a = :pid OR paper_id_b = :pid
            GROUP BY related_id
            ORDER BY strength DESC
            LIMIT :lim
        """),
        {"pid": str(paper_uuid), "lim": limit},
    )

    related = []
    for row in rows.all():
        # Resolve PMID from entity_id
        pmid_result = await db.execute(
            select(ResearchEvent.metadata["pmid"].astext)
            .where(ResearchEvent.entity_id == row.related_id, ResearchEvent.event_type == "paper_saved")
            .limit(1)
        )
        related_pmid = pmid_result.scalar() or str(row.related_id)
        related.append(RelatedPaper(pmid=related_pmid, co_save_count=int(row.strength)))

    return CoSaveRecommendations(source_pmid=pmid, related=related)


# ── Time-on-Paper ─────────────────────────────────────────────────────────────

@router.post("/events/time-on-paper")
async def record_time_on_paper(
    paper_id: UUID,
    pmid: str,
    seconds: int,
    project_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    Called when the user navigates away from a paper detail page.
    Frontend: window.addEventListener('beforeunload', ...) or visibility change.
    """
    event = ResearchEvent(
        user_id=current_user.id if current_user else None,
        project_id=project_id,
        event_type="time_on_paper",
        entity_type="paper",
        entity_id=paper_id,
        metadata={"pmid": pmid, "seconds": seconds},
    )
    db.add(event)
    await db.commit()
    return {"recorded": True}


# ── Nightly Analytics Job ─────────────────────────────────────────────────────
# Call this from a scheduler (APScheduler, Celery beat, cron, etc.)

async def run_nightly_aggregation(db: AsyncSession) -> dict:
    """
    Aggregates research_events into the three analytics tables.
    Idempotent: uses INSERT ... ON CONFLICT DO UPDATE.
    """
    today = date.today()
    yesterday = today - timedelta(days=1)
    results = {}

    # ── Topic analytics ──────────────────────────────────────────────────────
    topic_agg = await db.execute(
        text("""
            SELECT
                metadata->>'query' AS topic,
                COUNT(*) FILTER (WHERE event_type = 'search')    AS search_count,
                COUNT(*) FILTER (WHERE event_type = 'paper_view') AS view_count,
                COUNT(*) FILTER (WHERE event_type = 'paper_saved') AS save_count
            FROM research_events
            WHERE created_at::date = :day
              AND metadata->>'query' IS NOT NULL
            GROUP BY topic
            HAVING COUNT(*) > 0
        """),
        {"day": yesterday},
    )
    topic_rows = topic_agg.all()
    for row in topic_rows:
        await db.execute(
            pg_insert(TopicAnalytic)
            .values(topic=row.topic, search_count=row.search_count, view_count=row.view_count, save_count=row.save_count, period_date=yesterday)
            .on_conflict_do_update(
                index_elements=["topic", "period_date"],
                set_={"search_count": row.search_count, "view_count": row.view_count, "save_count": row.save_count},
            )
        )
    results["topics_written"] = len(topic_rows)

    # ── Paper analytics ──────────────────────────────────────────────────────
    paper_agg = await db.execute(
        text("""
            SELECT
                metadata->>'pmid' AS pmid,
                COUNT(*) FILTER (WHERE event_type = 'paper_view')       AS view_count,
                COUNT(*) FILTER (WHERE event_type = 'paper_saved')      AS save_count,
                COUNT(*) FILTER (WHERE event_type = 'review_generated') AS review_count,
                AVG((metadata->>'seconds')::int)
                    FILTER (WHERE event_type = 'time_on_paper')         AS avg_time
            FROM research_events
            WHERE created_at::date = :day
              AND metadata->>'pmid' IS NOT NULL
            GROUP BY pmid
        """),
        {"day": yesterday},
    )
    paper_rows = paper_agg.all()
    for row in paper_rows:
        await db.execute(
            pg_insert(PaperAnalytic)
            .values(pmid=row.pmid, view_count=row.view_count, save_count=row.save_count, review_count=row.review_count, avg_time_on_paper_seconds=int(row.avg_time) if row.avg_time else None, period_date=yesterday)
            .on_conflict_do_update(
                index_elements=["pmid", "period_date"],
                set_={"view_count": row.view_count, "save_count": row.save_count, "review_count": row.review_count, "avg_time_on_paper_seconds": int(row.avg_time) if row.avg_time else None},
            )
        )
    results["papers_written"] = len(paper_rows)

    # ── Trend analytics (velocity = recent vs. 7-day baseline) ──────────────
    week_ago = today - timedelta(days=8)
    trend_agg = await db.execute(
        text("""
            SELECT
                topic,
                SUM(search_count) FILTER (WHERE period_date >= :week_ago AND period_date < :yesterday) AS baseline,
                SUM(search_count) FILTER (WHERE period_date = :yesterday)                               AS recent
            FROM topic_analytics
            WHERE period_date >= :week_ago
            GROUP BY topic
        """),
        {"week_ago": week_ago, "yesterday": yesterday},
    )
    for row in trend_agg.all():
        baseline = row.baseline or 0
        recent = row.recent or 0
        velocity = (recent - baseline / 7.0) / max(baseline / 7.0, 1)
        await db.execute(
            pg_insert(TrendAnalytic)
            .values(topic=row.topic, velocity_score=velocity, baseline_count=int(baseline), recent_count=int(recent), period_date=yesterday)
            .on_conflict_do_update(
                index_elements=["topic", "period_date"],
                set_={"velocity_score": velocity, "baseline_count": int(baseline), "recent_count": int(recent)},
            )
        )
    results["trends_written"] = trend_agg.rowcount

    await db.commit()
    return results


# ── Private Helpers ────────────────────────────────────────────────────────────

async def _update_co_save_graph(db: AsyncSession, paper_id: Optional[UUID], project_id: UUID, current_user) -> None:
    """
    When a paper is saved, find all other papers in the same project
    and increment their co_save edge weight.
    """
    if not paper_id:
        return

    # Get other papers recently saved to the same project (last 500 saves)
    rows = await db.execute(
        select(ResearchEvent.entity_id)
        .where(
            ResearchEvent.project_id == project_id,
            ResearchEvent.event_type == "paper_saved",
            ResearchEvent.entity_id != paper_id,
            ResearchEvent.entity_id.isnot(None),
        )
        .distinct()
        .limit(500)
    )
    other_ids = [r for r in rows.scalars()]

    for other_id in other_ids:
        # Enforce canonical ordering (lower UUID first)
        a, b = sorted([str(paper_id), str(other_id)])
        await db.execute(
            pg_insert(PaperCoSave)
            .values(paper_id_a=a, paper_id_b=b, project_id=project_id, co_save_count=1, last_seen_at=datetime.now(timezone.utc))
            .on_conflict_do_update(
                index_elements=["paper_id_a", "paper_id_b", "project_id"],
                set_={
                    "co_save_count": PaperCoSave.co_save_count + 1,
                    "last_seen_at": datetime.now(timezone.utc),
                },
            )
        )
    if other_ids:
        await db.commit()
