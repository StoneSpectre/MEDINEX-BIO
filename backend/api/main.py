"""
Medinex Workspace API
FastAPI application — Steps 1–3
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import settings
from api.core.database import engine, Base
from api.routers import projects, folders, collections, saved_papers, notes, literature


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Medinex Workspace API",
    version="0.3.0",
    description="Researcher workspace — Steps 1–3: schema, CRUD, literature tracker",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Routers ----
app.include_router(projects.router,      prefix="/api/v1/projects",      tags=["Projects"])
app.include_router(folders.router,       prefix="/api/v1/folders",        tags=["Folders"])
app.include_router(collections.router,   prefix="/api/v1/collections",    tags=["Collections"])
app.include_router(saved_papers.router,  prefix="/api/v1/saved-papers",   tags=["Saved Papers"])
app.include_router(notes.router,         prefix="/api/v1/notes",          tags=["Notes"])
app.include_router(literature.router,    prefix="/api/v1/literature",     tags=["Literature Tracker"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": app.version}
