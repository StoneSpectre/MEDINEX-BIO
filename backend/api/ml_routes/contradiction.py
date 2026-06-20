from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
import logging

from medinex.step7_contradiction.pipeline import (
    ingest_paper, 
    detect_contradictions_for_pair, 
    cluster_and_hypothesize, 
    discover_gaps_and_rank
)

router = APIRouter()
logger = logging.getLogger(__name__)

class IngestRequest(BaseModel):
    paper_path: str
    title: str
    doi: Optional[str] = None

@router.post("/ingest")
async def ingest_paper_route(request: IngestRequest):
    """
    Step 7.1-7.2: Extract claims from a single paper and insert them into Postgres + Neo4j.
    """
    try:
        await ingest_paper(request.paper_path, request.title, request.doi)
        return {"status": "success", "message": f"Successfully ingested paper: {request.title}"}
    except Exception as e:
        logger.error(f"Error in ingest: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class DetectRequest(BaseModel):
    subject_entity_id: str
    object_entity_id: str

@router.post("/detect")
async def detect_contradictions_route(request: DetectRequest):
    """
    Step 7.3-7.4: Run NLI over an entity-pair bucket to find contradictions.
    """
    try:
        num_edges = await detect_contradictions_for_pair(request.subject_entity_id, request.object_entity_id)
        return {"status": "success", "contradiction_edges_found": num_edges}
    except Exception as e:
        logger.error(f"Error in detect: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cluster")
def cluster_route():
    """
    Step 7.5-7.6: Pull the full contradiction graph, cluster it, and generate hypotheses.
    """
    try:
        cluster_and_hypothesize()
        return {"status": "success", "message": "Clustering and hypothesis generation complete."}
    except Exception as e:
        logger.error(f"Error in cluster: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/discover-gaps")
def discover_gaps_route():
    """
    Step 7.7-7.8: Identify structurally important knowledge gaps and score them.
    """
    try:
        discover_gaps_and_rank()
        return {"status": "success", "message": "Gap discovery and scoring complete."}
    except Exception as e:
        logger.error(f"Error in gap discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
