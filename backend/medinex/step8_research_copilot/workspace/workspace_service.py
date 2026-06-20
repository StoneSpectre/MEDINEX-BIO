"""
Step 8.3 — Workspace Layer

Postgres-backed research workspace. Users create Projects (not conversations).
Each Project contains:
  - saved_papers: curated literature collection
  - notes: freeform research notes with Markdown
  - collections: named paper sets (e.g., "RCTs on APOE", "Contradicted Claims")
  - boards: Kanban-style research planning boards

Multi-tenant: every row is scoped to tenant_id (from Step 10).
All writes are versioned for collaborative editing (Step 10.4).
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional
import asyncpg


# ── DDL ───────────────────────────────────────────────────────────────────────
WORKSPACE_SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    user_id         UUID NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived', 'shared')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_user   ON projects(user_id);

CREATE TABLE IF NOT EXISTS saved_papers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    paper_id        UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    collection_name TEXT,
    annotation      TEXT,
    saved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, paper_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_papers_project ON saved_papers(project_id);

CREATE TABLE IF NOT EXISTS notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',     -- Markdown
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    columns         JSONB NOT NULL DEFAULT '[]',  -- [{name, card_ids}]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_name     TEXT NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT,
    linked_paper_ids UUID[],
    linked_claim_ids UUID[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


@dataclass
class Project:
    id: str
    tenant_id: str
    user_id: str
    title: str
    description: str
    status: str


@dataclass
class Note:
    id: str
    project_id: str
    user_id: str
    title: str
    content: str
    version: int


class WorkspaceService:
    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    async def ensure_schema(self) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(WORKSPACE_SCHEMA)

    # ── Projects ─────────────────────────────────────────────────────────────
    async def create_project(self, tenant_id: str, user_id: str,
                              title: str, description: str = "") -> Project:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO projects (tenant_id, user_id, title, description)
                VALUES ($1, $2, $3, $4)
                RETURNING id::text, tenant_id::text, user_id::text, title, description, status
                """,
                uuid.UUID(tenant_id), uuid.UUID(user_id), title, description,
            )
        return Project(**dict(row))

    async def list_projects(self, tenant_id: str, user_id: str) -> list[Project]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id::text, tenant_id::text, user_id::text, title, description, status
                FROM projects
                WHERE tenant_id = $1 AND user_id = $2 AND status != 'archived'
                ORDER BY updated_at DESC
                """,
                uuid.UUID(tenant_id), uuid.UUID(user_id),
            )
        return [Project(**dict(r)) for r in rows]

    async def get_project(self, project_id: str, tenant_id: str) -> Optional[Project]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id::text, tenant_id::text, user_id::text, title, description, status
                FROM projects WHERE id = $1 AND tenant_id = $2
                """,
                uuid.UUID(project_id), uuid.UUID(tenant_id),
            )
        return Project(**dict(row)) if row else None

    # ── Saved Papers ─────────────────────────────────────────────────────────
    async def save_paper(self, project_id: str, paper_id: str,
                          collection_name: str = "", annotation: str = "") -> str:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO saved_papers (project_id, paper_id, collection_name, annotation)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (project_id, paper_id) DO UPDATE
                SET annotation = EXCLUDED.annotation,
                    collection_name = EXCLUDED.collection_name
                RETURNING id::text
                """,
                uuid.UUID(project_id), uuid.UUID(paper_id), collection_name, annotation,
            )
        return row["id"]

    async def get_saved_papers(self, project_id: str,
                                collection_name: Optional[str] = None) -> list[dict]:
        async with self._pool.acquire() as conn:
            if collection_name:
                rows = await conn.fetch(
                    """
                    SELECT sp.id::text, sp.paper_id::text, p.title, p.abstract,
                           sp.collection_name, sp.annotation, sp.saved_at
                    FROM saved_papers sp JOIN papers p ON p.id = sp.paper_id
                    WHERE sp.project_id = $1 AND sp.collection_name = $2
                    ORDER BY sp.saved_at DESC
                    """,
                    uuid.UUID(project_id), collection_name,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT sp.id::text, sp.paper_id::text, p.title, p.abstract,
                           sp.collection_name, sp.annotation, sp.saved_at
                    FROM saved_papers sp JOIN papers p ON p.id = sp.paper_id
                    WHERE sp.project_id = $1
                    ORDER BY sp.saved_at DESC
                    """,
                    uuid.UUID(project_id),
                )
        return [dict(r) for r in rows]

    # ── Notes ─────────────────────────────────────────────────────────────────
    async def create_note(self, project_id: str, user_id: str,
                           title: str, content: str = "") -> Note:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO notes (project_id, user_id, title, content)
                VALUES ($1, $2, $3, $4)
                RETURNING id::text, project_id::text, user_id::text, title, content, version
                """,
                uuid.UUID(project_id), uuid.UUID(user_id), title, content,
            )
        return Note(**dict(row))

    async def update_note(self, note_id: str, content: str) -> Optional[Note]:
        """Atomic version bump + content update."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE notes SET content = $2, version = version + 1, updated_at = now()
                WHERE id = $1
                RETURNING id::text, project_id::text, user_id::text, title, content, version
                """,
                uuid.UUID(note_id), content,
            )
        return Note(**dict(row)) if row else None
