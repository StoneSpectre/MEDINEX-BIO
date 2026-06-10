"""
Integration tests — Steps 1–3
Runs against an in-memory SQLite database (async).
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from unittest.mock import patch
from uuid import uuid4

# ── Bootstrap ────────────────────────────────────────────────────────────────

TEST_DB = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB, echo=False)
TestSession  = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

TEST_USER_ID = uuid4()


async def override_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def override_auth():
    return TEST_USER_ID


@pytest.fixture(autouse=True, scope="session")
def event_loop_policy():
    import asyncio
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())


@pytest_asyncio.fixture(scope="session")
async def app():
    from api.core.database import Base, get_db
    from api.core.auth import get_current_user_id
    from api.main import app as _app

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    _app.dependency_overrides[get_db] = override_db
    _app.dependency_overrides[get_current_user_id] = override_auth
    yield _app
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ── Helpers ──────────────────────────────────────────────────────────────────

async def make_project(client, title="Test Project"):
    r = await client.post("/api/v1/projects", json={"title": title})
    assert r.status_code == 201, r.text
    return r.json()


async def make_collection(client, project_id, title="Col A"):
    r = await client.post("/api/v1/collections", json={"project_id": str(project_id), "title": title})
    assert r.status_code == 201, r.text
    return r.json()


async def save_paper(client, project_id, collection_id=None, title="A paper on BRCA1"):
    body = {
        "project_id": str(project_id),
        "title": title,
        "authors": [{"name": "Alice"}],
        "pubmed_id": "12345678",
    }
    if collection_id:
        body["collection_id"] = str(collection_id)
    r = await client.post("/api/v1/saved-papers", json=body)
    assert r.status_code == 201, r.text
    return r.json()


# ── Step 1+2 — Project CRUD ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_project(client):
    p = await make_project(client)
    assert p["title"] == "Test Project"
    assert p["visibility"] == "private"


@pytest.mark.asyncio
async def test_list_projects(client):
    await make_project(client, "Proj X")
    r = await client.get("/api/v1/projects")
    assert r.status_code == 200
    assert any(p["title"] == "Proj X" for p in r.json())


@pytest.mark.asyncio
async def test_update_project(client):
    p = await make_project(client, "Old Title")
    r = await client.patch(f"/api/v1/projects/{p['id']}", json={"title": "New Title"})
    assert r.status_code == 200
    assert r.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_project(client):
    p = await make_project(client, "Deletable")
    r = await client.delete(f"/api/v1/projects/{p['id']}")
    assert r.status_code == 204
    r2 = await client.get(f"/api/v1/projects/{p['id']}")
    assert r2.status_code == 404


# ── Step 2 — Collection + Folder CRUD ────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_collection(client):
    p = await make_project(client)
    c = await make_collection(client, p["id"])
    assert c["title"] == "Col A"
    assert c["project_id"] == p["id"]


@pytest.mark.asyncio
async def test_create_folder(client):
    p = await make_project(client)
    r = await client.post("/api/v1/folders", json={"project_id": p["id"], "name": "Folder 1"})
    assert r.status_code == 201
    assert r.json()["name"] == "Folder 1"


# ── Step 2 — Saved Paper CRUD ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_save_paper(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    assert paper["title"] == "A paper on BRCA1"
    assert paper["status"] == "unread"


@pytest.mark.asyncio
async def test_save_paper_with_collection(client):
    p = await make_project(client)
    c = await make_collection(client, p["id"])
    paper = await save_paper(client, p["id"], collection_id=c["id"])
    assert paper["collection_id"] == c["id"]


@pytest.mark.asyncio
async def test_list_papers(client):
    p = await make_project(client)
    await save_paper(client, p["id"], title="Paper Alpha")
    await save_paper(client, p["id"], title="Paper Beta")
    r = await client.get(f"/api/v1/saved-papers/project/{p['id']}")
    assert r.status_code == 200
    titles = [pp["title"] for pp in r.json()]
    assert "Paper Alpha" in titles
    assert "Paper Beta" in titles


@pytest.mark.asyncio
async def test_update_paper(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    r = await client.patch(f"/api/v1/saved-papers/{paper['id']}", json={"relevance": 4})
    assert r.status_code == 200
    assert r.json()["relevance"] == 4


@pytest.mark.asyncio
async def test_move_paper_to_collection(client):
    p = await make_project(client)
    c = await make_collection(client, p["id"], "Dest Collection")
    paper = await save_paper(client, p["id"])
    r = await client.post(
        f"/api/v1/saved-papers/{paper['id']}/move-collection",
        json={"collection_id": c["id"]},
    )
    assert r.status_code == 200
    assert r.json()["collection_id"] == c["id"]


# ── Step 2 — Notes ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_note(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    r = await client.post("/api/v1/notes", json={
        "project_id": p["id"],
        "paper_id": paper["id"],
        "title": "Key insight",
        "body": "BRCA1 mutation increases breast cancer risk.",
        "tags": ["genetics", "oncology"],
    })
    assert r.status_code == 201
    note = r.json()
    assert note["title"] == "Key insight"
    assert "genetics" in note["tags"]


# ── Step 3 — Literature Tracker ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_status_transition_valid(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    # unread → reading
    r = await client.post(f"/api/v1/literature/{paper['id']}/status", json={"status": "reading"})
    assert r.status_code == 200
    assert r.json()["status"] == "reading"
    # reading → done
    r2 = await client.post(f"/api/v1/literature/{paper['id']}/status", json={"status": "done"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "done"


@pytest.mark.asyncio
async def test_status_transition_invalid(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    # unread → cited should fail
    r = await client.post(f"/api/v1/literature/{paper['id']}/status", json={"status": "cited"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_add_remove_tag(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    r = await client.post(f"/api/v1/literature/{paper['id']}/tags/genomics")
    assert r.status_code == 200
    assert "genomics" in r.json()["tags"]
    r2 = await client.delete(f"/api/v1/literature/{paper['id']}/tags/genomics")
    assert "genomics" not in r2.json()["tags"]


@pytest.mark.asyncio
async def test_reading_session_log(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    r = await client.post(f"/api/v1/literature/{paper['id']}/session", json={"seconds": 120})
    assert r.status_code == 200
    data = r.json()
    assert data["time_spent_seconds"] == 120
    # Auto-promoted to 'reading' after 30s
    assert data["status"] == "reading"


@pytest.mark.asyncio
async def test_neo4j_link_add_and_list(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    r = await client.post(f"/api/v1/saved-papers/{paper['id']}/neo4j-links", json={
        "neo4j_node_id": "disease:breast_cancer",
        "node_type": "Disease",
        "node_label": "Breast Cancer",
        "link_source": "manual",
    })
    assert r.status_code == 201
    link = r.json()
    assert link["neo4j_node_id"] == "disease:breast_cancer"

    r2 = await client.get(f"/api/v1/saved-papers/{paper['id']}/neo4j-links")
    assert len(r2.json()) == 1


@pytest.mark.asyncio
async def test_neo4j_link_duplicate_rejected(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    body = {"neo4j_node_id": "gene:brca2", "node_type": "Gene", "node_label": "BRCA2"}
    await client.post(f"/api/v1/saved-papers/{paper['id']}/neo4j-links", json=body)
    r = await client.post(f"/api/v1/saved-papers/{paper['id']}/neo4j-links", json=body)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_literature_stats(client):
    p = await make_project(client)
    paper1 = await save_paper(client, p["id"], title="Paper 1")
    paper2 = await save_paper(client, p["id"], title="Paper 2")
    # advance paper2 to reading
    await client.post(f"/api/v1/literature/{paper2['id']}/status", json={"status": "reading"})

    r = await client.get(f"/api/v1/literature/stats/{p['id']}")
    assert r.status_code == 200
    stats = r.json()
    assert stats["total"] >= 2
    assert stats["reading"] >= 1


@pytest.mark.asyncio
async def test_graph_linked_papers(client):
    p = await make_project(client)
    paper = await save_paper(client, p["id"])
    await client.post(f"/api/v1/saved-papers/{paper['id']}/neo4j-links", json={
        "neo4j_node_id": "drug:tamoxifen",
        "node_type": "Drug",
        "node_label": "Tamoxifen",
    })
    r = await client.get(f"/api/v1/literature/graph-linked/{p['id']}")
    assert r.status_code == 200
    assert any(pp["id"] == paper["id"] for pp in r.json())


@pytest.mark.asyncio
async def test_bulk_status_update(client):
    p = await make_project(client)
    p1 = await save_paper(client, p["id"], title="Bulk 1")
    p2 = await save_paper(client, p["id"], title="Bulk 2")
    r = await client.post("/api/v1/literature/bulk-status", json={
        "paper_ids": [p1["id"], p2["id"]],
        "status": "reading",
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 2
