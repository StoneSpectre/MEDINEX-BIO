from fastapi import APIRouter, Depends, HTTPException
from typing import List
import os
from sqlalchemy.ext.asyncio import AsyncSession
from api.core.database import get_db

from .schemas import (
    PaperRecRequest, PaperRecResponse,
    DatasetRecRequest, DatasetRecResponse,
    TopicVelocityRequest, TopicVelocityResponse
)
from .dataset.quality_score import compute_quality_score
from .topic.velocity import compute_topic_velocity
from .paper.explanation import generate_claude_explanation

router = APIRouter()

@router.post("/paper", response_model=PaperRecResponse)
async def recommend_paper(req: PaperRecRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing Anthropic API Key")

    explanation = await generate_claude_explanation(
        req.user_context, req.abstract, api_key
    )
    return PaperRecResponse(
        paper_id=req.paper_id,
        score=0.95, # Mock score integration
        explanation_bullets=explanation.get("bullets", [])
    )

@router.post("/dataset", response_model=List[DatasetRecResponse])
async def recommend_datasets(req: DatasetRecRequest):
    results = []
    for d in req.datasets:
        score = compute_quality_score(d, req.max_n, req.max_c)
        results.append(DatasetRecResponse(dataset_id=d.get("id", "unknown"), quality_score=score))
    
    # sort descending by score
    results.sort(key=lambda x: x.quality_score, reverse=True)
    return results

@router.post("/topic", response_model=TopicVelocityResponse)
async def topic_velocity(req: TopicVelocityRequest, db: AsyncSession = Depends(get_db)):
    res = await compute_topic_velocity(req.cluster_id, db, req.horizon_months)
    return TopicVelocityResponse(
        cluster_id=req.cluster_id,
        velocity=res['velocity'],
        trend=res['trend']
    )
