"""
medinex/main.py
────────────────
FastAPI application entrypoint for the Medinex NLP Layer.

Run with:
  uvicorn medinex.main:app --reload --port 8001

Or via the helper script:
  python -m medinex.main
"""

from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from medinex.nlp.api.router import router as nlp_router
from medinex.nlp.pipeline.model_loader import get_model_registry

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: pre-load NLP models so the first request doesn't pay cold-start cost.
    Shutdown: nothing special needed (spaCy models are stateless).
    """
    logger.info("Starting Medinex NLP Layer...")
    reg = get_model_registry()
    logger.info(
        f"Models ready: {reg.models_loaded} | "
        f"Linker: {reg.linker_available} | "
        f"Fallback: {reg.fallback_mode}"
    )
    yield
    logger.info("Medinex NLP Layer shutting down.")


app = FastAPI(
    title="Medinex NLP Layer",
    description=(
        "Phase 3 of the Medinex biomedical research platform. "
        "NER + UMLS entity linking for automated knowledge graph expansion."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nlp_router)


@app.get("/")
def root():
    return {
        "service": "Medinex NLP Layer",
        "phase": 3,
        "docs": "/docs",
        "health": "/nlp/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("medinex.main:app", host="0.0.0.0", port=8001, reload=True)
