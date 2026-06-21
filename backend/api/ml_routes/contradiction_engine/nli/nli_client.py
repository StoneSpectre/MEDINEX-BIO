from __future__ import annotations

import httpx


class NLIClient:
    """Thin HTTP client for the nli-service (nli/nli_service.py)."""

    def __init__(self, base_url: str, timeout: float = 10.0):
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(timeout=timeout)

    def infer(self, premise: str, hypothesis: str) -> dict:
        resp = self._client.post(
            f"{self._base_url}/infer",
            json={"premise": premise, "hypothesis": hypothesis},
        )
        resp.raise_for_status()
        return resp.json()

    def close(self) -> None:
        self._client.close()
