"""
Step 8.2 — Session Memory

Redis-backed session state for the Research Copilot.
Stores per-session:
  - Message history (user + assistant turns)
  - Active entity IDs (accumulated across turns for graph continuity)
  - Current research topic
  - Referenced paper IDs (for follow-up deduplication)

Design choices:
  - TTL-based expiry: sessions expire after REDIS_SESSION_TTL seconds of inactivity
  - Serialized as JSON: cheap, debuggable, portable
  - session_id is a UUID generated at session start and stored in the JWT / cookie
  - Rolling window: only last MAX_MESSAGES turns kept in memory to bound context size
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from typing import Optional
import redis.asyncio as aioredis


MAX_MESSAGES = 20  # keep last 20 turns (10 exchanges) to bound context size


@dataclass
class Message:
    role: str        # "user" | "assistant"
    content: str
    timestamp: float = 0.0


@dataclass
class SessionState:
    session_id: str
    user_id: str
    current_topic: str = ""
    entity_ids: list[str] = field(default_factory=list)
    referenced_paper_ids: list[str] = field(default_factory=list)
    messages: list[Message] = field(default_factory=list)

    def to_context_string(self) -> str:
        """Serialize recent messages for injection into WriterAgent prompt."""
        if not self.messages:
            return ""
        lines = [f"Current topic: {self.current_topic}"] if self.current_topic else []
        for msg in self.messages[-6:]:  # last 3 exchanges
            prefix = "User" if msg.role == "user" else "Assistant"
            lines.append(f"{prefix}: {msg.content[:400]}")
        return "\n".join(lines)


class SessionMemory:
    def __init__(self, redis_url: str, ttl_seconds: int = 86400):
        self._redis = aioredis.from_url(redis_url, decode_responses=True)
        self._ttl = ttl_seconds

    def _key(self, session_id: str) -> str:
        return f"medinex:session:{session_id}"

    async def create_session(self, user_id: str) -> SessionState:
        session = SessionState(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
        )
        await self._save(session)
        return session

    async def get_session(self, session_id: str) -> Optional[SessionState]:
        raw = await self._redis.get(self._key(session_id))
        if not raw:
            return None
        data = json.loads(raw)
        data["messages"] = [Message(**m) for m in data.get("messages", [])]
        return SessionState(**{k: v for k, v in data.items() if k != "messages"},
                            messages=data["messages"])

    async def add_message(self, session_id: str, role: str, content: str,
                          new_entities: Optional[list[str]] = None,
                          new_paper_ids: Optional[list[str]] = None) -> None:
        session = await self.get_session(session_id)
        if not session:
            return

        import time
        session.messages.append(Message(role=role, content=content, timestamp=time.time()))

        # Rolling window: drop oldest messages beyond MAX_MESSAGES
        if len(session.messages) > MAX_MESSAGES:
            session.messages = session.messages[-MAX_MESSAGES:]

        if new_entities:
            # Deduplicate while preserving order
            seen = set(session.entity_ids)
            for eid in new_entities:
                if eid not in seen:
                    session.entity_ids.append(eid)
                    seen.add(eid)

        if new_paper_ids:
            seen = set(session.referenced_paper_ids)
            for pid in new_paper_ids:
                if pid not in seen:
                    session.referenced_paper_ids.append(pid)
                    seen.add(pid)

        await self._save(session)

    async def update_topic(self, session_id: str, topic: str) -> None:
        session = await self.get_session(session_id)
        if session:
            session.current_topic = topic
            await self._save(session)

    async def _save(self, session: SessionState) -> None:
        data = asdict(session)
        await self._redis.setex(
            self._key(session.session_id),
            self._ttl,
            json.dumps(data),
        )

    async def delete_session(self, session_id: str) -> None:
        await self._redis.delete(self._key(session_id))

    async def close(self) -> None:
        await self._redis.aclose()
