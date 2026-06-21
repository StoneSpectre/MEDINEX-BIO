"""
medinex/nlp/workers/celery_app.py
───────────────────────────────────
Celery application + task definitions for async NLP processing.

Tasks:
  process_paper_task   — single paper (used by batch and scheduler)
  process_batch_task   — fan-out: spawns one process_paper_task per paper
  get_batch_status     — polls result of a batch job

Usage:
  # Start worker (from project root):
  celery -A medinex.nlp.workers.celery_app worker --loglevel=info -c 4

  # Start with beat scheduler (Step 6):
  celery -A medinex.nlp.workers.celery_app worker --beat --loglevel=info
"""

from __future__ import annotations
import os
import logging
from celery import Celery, group
from celery.result import GroupResult

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# ── App init ──────────────────────────────────────────────────────────────────

celery_app = Celery(
    "medinex_nlp",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,               # requeue on worker crash
    worker_prefetch_multiplier=1,       # fair dispatch for slow NLP tasks
    result_expires=86400,               # results live 24h in Redis
    task_routes={
        "medinex.nlp.workers.celery_app.process_paper_task": {"queue": "nlp"},
        "medinex.nlp.workers.celery_app.process_batch_task": {"queue": "nlp"},
    },
)


# ── Tasks ─────────────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="medinex.nlp.workers.celery_app.process_paper_task",
    max_retries=3,
    default_retry_delay=10,
    soft_time_limit=120,   # 2 min per paper
    time_limit=150,
)
def process_paper_task(self, paper_dict: dict, write_to_neo4j: bool = True) -> dict:
    """
    Process a single paper through the NLP pipeline.
    paper_dict matches ProcessRequest schema.
    Returns NLPResult as dict (serialisable for Celery backend).
    """
    from medinex.nlp.models.schemas import ProcessRequest, NLPResult
    from medinex.nlp.pipeline.ner_pipeline import process_text
    from medinex.nlp.utils.neo4j_client import Neo4jClient

    try:
        request = ProcessRequest(**paper_dict)
        result: NLPResult = process_text(request)

        if write_to_neo4j and result.entity_count > 0:
            client = Neo4jClient()
            if client.connect():
                written = client.write_nlp_result(result)
                result.written_to_neo4j = written > 0
                client.close()

        return result.model_dump()

    except Exception as exc:
        logger.error(f"process_paper_task failed for pmid={paper_dict.get('pmid')}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="medinex.nlp.workers.celery_app.process_batch_task",
    max_retries=1,
    soft_time_limit=3600,
)
def process_batch_task(self, papers: list[dict]) -> dict:
    """
    Fan-out: submits a group of process_paper_task subtasks.
    Returns a group_id to poll via /nlp/batch/{job_id}/status.
    """
    subtasks = group(
        process_paper_task.s(paper, True) for paper in papers
    )
    result: GroupResult = subtasks.apply_async()
    result.save()

    return {
        "group_id": result.id,
        "total": len(papers),
        "status": "queued",
    }


def get_batch_job_status(group_id: str) -> dict:
    """
    Poll a group result by ID.
    Returns structured status dict for the API.
    """
    from celery.result import GroupResult  # noqa
    result = GroupResult.restore(group_id, app=celery_app)

    if result is None:
        return {"status": "not_found", "group_id": group_id}

    completed = sum(1 for r in result.results if r.ready() and r.successful())
    failed = sum(1 for r in result.results if r.ready() and r.failed())
    total = len(result.results)

    status = "running"
    if completed + failed == total:
        status = "done" if failed == 0 else "partial_failure"

    return {
        "group_id": group_id,
        "status": status,
        "total": total,
        "completed": completed,
        "failed": failed,
    }
