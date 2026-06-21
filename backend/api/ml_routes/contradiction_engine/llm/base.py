from __future__ import annotations

from abc import ABC, abstractmethod


class LLMClient(ABC):
    """Minimal interface the rest of Step 7 codes against."""

    @abstractmethod
    def complete_json(self, system: str, user: str, max_tokens: int = 1024) -> str:
        """Return raw text the caller will json.loads(). Implementations should
        instruct the underlying model to return ONLY JSON, no prose, no fences."""
        raise NotImplementedError
