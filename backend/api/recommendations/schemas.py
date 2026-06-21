from pydantic import BaseModel
from typing import List, Optional

class PaperRecRequest(BaseModel):
    user_context: str
    paper_id: str
    abstract: str

class PaperRecResponse(BaseModel):
    paper_id: str
    score: float
    explanation_bullets: List[str]

class DatasetRecRequest(BaseModel):
    max_n: int = 10000
    max_c: int = 500
    datasets: List[dict]  # list of raw datasets to score

class DatasetRecResponse(BaseModel):
    dataset_id: str
    quality_score: float

class TopicVelocityRequest(BaseModel):
    cluster_id: str
    horizon_months: int = 24

class TopicVelocityResponse(BaseModel):
    cluster_id: str
    velocity: float
    trend: str
