from __future__ import annotations

import anthropic

from llm.base import LLMClient


class AnthropicLLMClient(LLMClient):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Export it or put it in your .env "
                "before running anything that calls AnthropicLLMClient."
            )
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    def complete_json(self, system: str, user: str, max_tokens: int = 1024) -> str:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system + "\n\nRespond with ONLY valid JSON. No prose, no markdown fences.",
            messages=[{"role": "user", "content": user}],
        )
        # Concatenate text blocks (tool-use blocks, if any, are ignored here
        # since this client is only used for plain JSON completions).
        return "".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        )
