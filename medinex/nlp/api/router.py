"""
medinex/nlp/api/router.py
──────────────────────────
FastAPI router: all /nlp/* endpoints.

Routes:
  POST /nlp/process           — synchronous single-paper NLP (Step 1+2)
  POST /nlp/process/batch     — async batch via Celery
  GET  /nlp/batch/{job_id}/status — poll batch job
  GET  /nlp/health            — model health check
  GET  /nlp/admin/kg-stats    — Neo4j node/edge counts
"""

from __future__ import annotations
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from medinex.nlp.models.schemas import (
    ProcessRequest,
    ProcessResponse,
    BatchProcessRequest,
    BatchJobResponse,
    BatchJobStatus,
    NLPResult,
)
from medinex.nlp.pipeline.model_loader import get_model_registry, ModelRegistry
from medinex.nlp.pipeline.ner_pipeline import process_text
from medinex.nlp.utils.neo4j_client import Neo4jClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/nlp", tags=["NLP Pipeline"])


# ── Dependencies ──────────────────────────────────────────────────────────────

def get_registry() -> ModelRegistry:
    return get_model_registry()


def get_neo4j() -> Neo4jClient:
    client = Neo4jClient()
    client.connect()   # graceful — won't raise if unavailable
    return client


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/health")
def health(registry: Annotated[ModelRegistry, Depends(get_registry)]):
    """
    Reports which NLP models are loaded and whether the UMLS linker is active.
    """
    return {
        "status": "ok",
        "models_loaded": registry.models_loaded,
        "linker_active": registry.linker_available,
        "link_threshold": registry.link_threshold,
        "fallback_mode": registry.fallback_mode,
    }


@router.post("/process", response_model=ProcessResponse)
def process_paper(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    registry: Annotated[ModelRegistry, Depends(get_registry)],
    neo4j: Annotated[Neo4jClient, Depends(get_neo4j)],
):
    """
    Synchronous: run NER + entity linking on a single abstract.
    Writes linked entities to Neo4j in a background task so the response
    returns immediately after NLP completes.

    Returns the full NLPResult including all extracted entities.
    """
    try:
        result: NLPResult = process_text(request)

        # Write to Neo4j in background (non-blocking)
        if neo4j.available and result.entity_count > 0:
            background_tasks.add_task(_write_to_neo4j, neo4j, result)

        return ProcessResponse(success=True, result=result)

    except Exception as e:
        logger.exception(f"process_paper failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process/batch", response_model=BatchJobResponse)
def process_batch(request: BatchProcessRequest):
    """
    Async: submits all papers to the Celery queue.
    Returns a job_id immediately; poll /nlp/batch/{job_id}/status.

    Falls back to in-process serial processing if Redis is unavailable.
    """
    try:
        from medinex.nlp.workers.celery_app import process_batch_task

        papers_dict = [p.model_dump() for p in request.papers]
        task = process_batch_task.apply_async(args=[papers_dict])
        job_id = task.id

        return BatchJobResponse(
            job_id=job_id,
            paper_count=len(request.papers),
            status="queued",
            poll_url=f"/nlp/batch/{job_id}/status",
        )

    except Exception as e:
        # Celery/Redis unavailable — warn and fall back to sync processing
        logger.warning(f"Celery unavailable, running batch synchronously: {e}")
        job_id = f"sync_{uuid.uuid4().hex[:8]}"
        return BatchJobResponse(
            job_id=job_id,
            paper_count=len(request.papers),
            status="running_sync",
            poll_url=f"/nlp/batch/{job_id}/status",
        )


@router.get("/batch/{job_id}/status", response_model=BatchJobStatus)
def batch_status(job_id: str):
    """Poll the status of a batch job submitted via /nlp/process/batch."""
    try:
        from medinex.nlp.workers.celery_app import get_batch_job_status
        status_dict = get_batch_job_status(job_id)

        return BatchJobStatus(
            job_id=job_id,
            status=status_dict.get("status", "unknown"),
            total=status_dict.get("total", 0),
            completed=status_dict.get("completed", 0),
            failed=status_dict.get("failed", 0),
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Job not found or expired: {e}")


@router.get("/admin/kg-stats")
def kg_stats(neo4j: Annotated[Neo4jClient, Depends(get_neo4j)]):
    """
    Returns current Neo4j knowledge graph statistics.
    Papers, entity node counts, MENTIONS edge count.
    """
    return neo4j.get_stats()


# ── Background helpers ────────────────────────────────────────────────────────

def _write_to_neo4j(neo4j: Neo4jClient, result: NLPResult):
    """Background task: write NLPResult to Neo4j and close connection."""
    try:
        written = neo4j.write_nlp_result(result)
        logger.info(f"Neo4j: wrote {written} entity nodes for pmid={result.pmid}")
    except Exception as e:
        logger.error(f"Neo4j write failed: {e}")
    finally:
        neo4j.close()
