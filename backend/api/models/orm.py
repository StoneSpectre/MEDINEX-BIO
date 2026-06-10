"""
SQLAlchemy ORM models — mirrors schema/001_initial.sql
"""

import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean, CheckConstraint, Column, Date, DateTime, Enum,
    ForeignKey, Integer, Numeric, SmallInteger, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from api.core.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class ReadingStatus(str, enum.Enum):
    unread  = "unread"
    reading = "reading"
    done    = "done"
    cited   = "cited"


class ProjectVisibility(str, enum.Enum):
    private = "private"
    shared  = "shared"
    public  = "public"


class ProjectRole(str, enum.Enum):
    owner  = "owner"
    editor = "editor"
    viewer = "viewer"


class NodeType(str, enum.Enum):
    Disease  = "Disease"
    Gene     = "Gene"
    Drug     = "Drug"
    Pathway  = "Pathway"
    Variant  = "Variant"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id           = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    email        = Column(Text, nullable=False, unique=True)
    display_name = Column(Text, nullable=False)
    avatar_url   = Column(Text)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at   = Column(DateTime(timezone=True))

    projects     = relationship("Project", back_populates="owner",
                                foreign_keys="Project.created_by")


class Project(Base):
    __tablename__ = "projects"

    id          = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    created_by  = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title       = Column(Text, nullable=False)
    description = Column(Text)
    color       = Column(String(7))
    icon        = Column(Text)
    visibility  = Column(Enum(ProjectVisibility), nullable=False, default=ProjectVisibility.private)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at  = Column(DateTime(timezone=True))

    owner       = relationship("User", back_populates="projects", foreign_keys=[created_by])
    folders     = relationship("Folder",     back_populates="project", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="project", cascade="all, delete-orphan")
    papers      = relationship("SavedPaper", back_populates="project", cascade="all, delete-orphan")
    notes       = relationship("Note",       back_populates="project", cascade="all, delete-orphan")
    members     = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")


class Folder(Base):
    __tablename__ = "folders"

    id         = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id  = Column(PG_UUID(as_uuid=True), ForeignKey("folders.id", ondelete="CASCADE"))
    name       = Column(Text, nullable=False)
    position   = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("id <> parent_id", name="no_self_parent"),
    )

    project  = relationship("Project",  back_populates="folders")
    children = relationship("Folder",   back_populates="parent")
    parent   = relationship("Folder",   back_populates="children", remote_side="Folder.id")


class Collection(Base):
    __tablename__ = "collections"

    id                 = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id         = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    folder_id          = Column(PG_UUID(as_uuid=True), ForeignKey("folders.id", ondelete="SET NULL"))
    created_by         = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title              = Column(Text, nullable=False)
    description        = Column(Text)
    color              = Column(String(7))
    tags               = Column(JSON, nullable=False, default=list)
    last_ai_review_at  = Column(DateTime(timezone=True))
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at         = Column(DateTime(timezone=True))

    project            = relationship("Project", back_populates="collections")
    folder             = relationship("Folder")
    papers             = relationship("SavedPaper", back_populates="collection")
    notes              = relationship("Note",       back_populates="collection")
    memberships        = relationship("PaperCollectionMembership", back_populates="collection",
                                      cascade="all, delete-orphan")


class SavedPaper(Base):
    __tablename__ = "saved_papers"

    id            = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id    = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    collection_id = Column(PG_UUID(as_uuid=True), ForeignKey("collections.id", ondelete="SET NULL"))
    folder_id     = Column(PG_UUID(as_uuid=True), ForeignKey("folders.id",     ondelete="SET NULL"))
    created_by    = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Bibliographic
    pubmed_id   = Column(Text)
    doi         = Column(Text)
    arxiv_id    = Column(Text)
    title       = Column(Text, nullable=False)
    abstract    = Column(Text)
    authors     = Column(JSON, nullable=False, default=list)
    journal     = Column(Text)
    pub_year    = Column(SmallInteger)
    pub_date    = Column(Date)
    url         = Column(Text)
    pdf_url     = Column(Text)

    # Neo4j bridge
    neo4j_node_id = Column(Text, index=True)
    node_type     = Column(Enum(NodeType))

    # Researcher metadata
    status      = Column(Enum(ReadingStatus), nullable=False, default=ReadingStatus.unread)
    tags        = Column(JSON, nullable=False, default=list)
    user_notes  = Column(Text)
    relevance   = Column(SmallInteger)
    position    = Column(Integer, nullable=False, default=0)

    # Behavioural (Step 8 seed)
    time_spent_seconds = Column(Integer, nullable=False, default=0)
    last_opened_at     = Column(DateTime(timezone=True))
    open_count         = Column(Integer, nullable=False, default=0)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at  = Column(DateTime(timezone=True))

    project    = relationship("Project",    back_populates="papers")
    collection = relationship("Collection", back_populates="papers")
    notes      = relationship("Note",       back_populates="paper", cascade="all, delete-orphan")
    neo4j_links = relationship("Neo4jPaperLink", back_populates="paper", cascade="all, delete-orphan")
    memberships = relationship("PaperCollectionMembership", back_populates="paper",
                               cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id            = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id    = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    created_by    = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    paper_id      = Column(PG_UUID(as_uuid=True), ForeignKey("saved_papers.id", ondelete="CASCADE"))
    collection_id = Column(PG_UUID(as_uuid=True), ForeignKey("collections.id",  ondelete="CASCADE"))
    folder_id     = Column(PG_UUID(as_uuid=True), ForeignKey("folders.id",      ondelete="CASCADE"))
    title         = Column(Text)
    body          = Column(Text, nullable=False, default="")
    body_format   = Column(Text, nullable=False, default="markdown")
    tags          = Column(JSON, nullable=False, default=list)
    is_pinned     = Column(Boolean, nullable=False, default=False)
    ai_generated  = Column(Boolean, nullable=False, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at    = Column(DateTime(timezone=True))

    project    = relationship("Project",    back_populates="notes")
    paper      = relationship("SavedPaper", back_populates="notes")
    collection = relationship("Collection", back_populates="notes")
    folder     = relationship("Folder")


class PaperCollectionMembership(Base):
    __tablename__ = "paper_collection_memberships"

    paper_id      = Column(PG_UUID(as_uuid=True), ForeignKey("saved_papers.id", ondelete="CASCADE"), primary_key=True)
    collection_id = Column(PG_UUID(as_uuid=True), ForeignKey("collections.id",  ondelete="CASCADE"), primary_key=True)
    added_by      = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    added_at      = Column(DateTime(timezone=True), server_default=func.now())
    position      = Column(Integer, nullable=False, default=0)

    paper      = relationship("SavedPaper", back_populates="memberships")
    collection = relationship("Collection", back_populates="memberships")


class Neo4jPaperLink(Base):
    __tablename__ = "neo4j_paper_links"

    id            = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    paper_id      = Column(PG_UUID(as_uuid=True), ForeignKey("saved_papers.id", ondelete="CASCADE"), nullable=False)
    neo4j_node_id = Column(Text, nullable=False)
    node_type     = Column(Enum(NodeType), nullable=False)
    node_label    = Column(Text)
    link_source   = Column(Text, nullable=False, default="manual")
    confidence    = Column(Numeric(4, 3))
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("paper_id", "neo4j_node_id", name="uq_paper_node"),
    )

    paper = relationship("SavedPaper", back_populates="neo4j_links")


class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(PG_UUID(as_uuid=True), ForeignKey("users.id",    ondelete="CASCADE"), primary_key=True)
    role       = Column(Enum(ProjectRole), nullable=False, default=ProjectRole.viewer)
    invited_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"))
    joined_at  = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="members")


class SearchEvent(Base):
    __tablename__ = "search_events"

    id           = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id      = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id   = Column(PG_UUID(as_uuid=True), ForeignKey("projects.id"))
    query        = Column(Text, nullable=False)
    result_count = Column(Integer)
    led_to_saves = Column(JSON, nullable=False, default=list)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
