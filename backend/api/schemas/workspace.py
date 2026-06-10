"""
Pydantic v2 schemas — request bodies and response models.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from api.models.orm import NodeType, ProjectRole, ProjectVisibility, ReadingStatus


# ─── Shared ──────────────────────────────────────────────────────────────────

class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: datetime


# ─── User ────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    model_config = {"from_attributes": True}


# ─── Project ─────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None
    visibility: ProjectVisibility = ProjectVisibility.private


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    visibility: Optional[ProjectVisibility] = None


class ProjectOut(TimestampMixin):
    id: UUID
    created_by: UUID
    title: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    visibility: ProjectVisibility
    model_config = {"from_attributes": True}


# ─── Folder ──────────────────────────────────────────────────────────────────

class FolderCreate(BaseModel):
    project_id: UUID
    parent_id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=200)
    position: int = 0


class FolderUpdate(BaseModel):
    parent_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=1)
    position: Optional[int] = None


class FolderOut(TimestampMixin):
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    position: int
    model_config = {"from_attributes": True}


# ─── Collection ──────────────────────────────────────────────────────────────

class CollectionCreate(BaseModel):
    project_id: UUID
    folder_id: Optional[UUID] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = None
    tags: List[str] = []


class CollectionUpdate(BaseModel):
    folder_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None


class CollectionOut(TimestampMixin):
    id: UUID
    project_id: UUID
    folder_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    color: Optional[str] = None
    tags: List[str]
    last_ai_review_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── Author ──────────────────────────────────────────────────────────────────

class Author(BaseModel):
    name: str
    affiliation: Optional[str] = None
    orcid: Optional[str] = None


# ─── SavedPaper ──────────────────────────────────────────────────────────────

class SavePaperRequest(BaseModel):
    project_id: UUID
    collection_id: Optional[UUID] = None
    folder_id: Optional[UUID] = None

    # Bibliographic
    pubmed_id: Optional[str] = None
    doi:       Optional[str] = None
    arxiv_id:  Optional[str] = None
    title:     str = Field(..., min_length=1)
    abstract:  Optional[str] = None
    authors:   List[Author] = []
    journal:   Optional[str] = None
    pub_year:  Optional[int] = None
    pub_date:  Optional[date] = None
    url:       Optional[str] = None
    pdf_url:   Optional[str] = None

    # Optional Neo4j link at save time
    neo4j_node_id: Optional[str] = None
    node_type:     Optional[NodeType] = None


class SavedPaperUpdate(BaseModel):
    collection_id: Optional[UUID] = None
    folder_id:     Optional[UUID] = None
    status:        Optional[ReadingStatus] = None
    tags:          Optional[List[str]] = None
    user_notes:    Optional[str] = None
    relevance:     Optional[int] = Field(None, ge=1, le=5)
    position:      Optional[int] = None


class SavedPaperOut(TimestampMixin):
    id: UUID
    project_id: UUID
    collection_id: Optional[UUID] = None
    folder_id:     Optional[UUID] = None
    pubmed_id:     Optional[str] = None
    doi:           Optional[str] = None
    arxiv_id:      Optional[str] = None
    title:         str
    abstract:      Optional[str] = None
    authors:       List[Any] = []
    journal:       Optional[str] = None
    pub_year:      Optional[int] = None
    pub_date:      Optional[date] = None
    url:           Optional[str] = None
    pdf_url:       Optional[str] = None
    neo4j_node_id: Optional[str] = None
    node_type:     Optional[NodeType] = None
    status:        ReadingStatus
    tags:          List[str]
    user_notes:    Optional[str] = None
    relevance:     Optional[int] = None
    open_count:    int
    last_opened_at: Optional[datetime] = None
    time_spent_seconds: int
    model_config = {"from_attributes": True}


# ─── Note ────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    project_id:    UUID
    paper_id:      Optional[UUID] = None
    collection_id: Optional[UUID] = None
    folder_id:     Optional[UUID] = None
    title:         Optional[str] = None
    body:          str = ""
    body_format:   str = "markdown"
    tags:          List[str] = []
    is_pinned:     bool = False


class NoteUpdate(BaseModel):
    title:     Optional[str] = None
    body:      Optional[str] = None
    tags:      Optional[List[str]] = None
    is_pinned: Optional[bool] = None


class NoteOut(TimestampMixin):
    id: UUID
    project_id:    UUID
    paper_id:      Optional[UUID] = None
    collection_id: Optional[UUID] = None
    folder_id:     Optional[UUID] = None
    title:         Optional[str] = None
    body:          str
    body_format:   str
    tags:          List[str]
    is_pinned:     bool
    ai_generated:  bool
    model_config = {"from_attributes": True}


# ─── Neo4j link ──────────────────────────────────────────────────────────────

class Neo4jLinkCreate(BaseModel):
    neo4j_node_id: str
    node_type:     NodeType
    node_label:    Optional[str] = None
    link_source:   str = "manual"
    confidence:    Optional[float] = Field(None, ge=0.0, le=1.0)


class Neo4jLinkOut(BaseModel):
    id: UUID
    paper_id: UUID
    neo4j_node_id: str
    node_type: NodeType
    node_label: Optional[str] = None
    link_source: str
    confidence: Optional[float] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Literature tracker ──────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: ReadingStatus


class BulkStatusUpdate(BaseModel):
    paper_ids: List[UUID]
    status: ReadingStatus


class ReadingSessionLog(BaseModel):
    """Log time spent on a paper."""
    seconds: int = Field(..., ge=1)


class LiteratureStats(BaseModel):
    total: int
    unread: int
    reading: int
    done: int
    cited: int
    tagged: int
    linked_to_graph: int


# ─── Move operations ─────────────────────────────────────────────────────────

class MoveToCollection(BaseModel):
    collection_id: UUID


class MoveToFolder(BaseModel):
    folder_id: UUID
