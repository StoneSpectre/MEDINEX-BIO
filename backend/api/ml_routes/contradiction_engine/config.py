"""
Central configuration for the Step 7 Contradiction Intelligence Engine.

All values are read from environment variables so this code can point at
real infrastructure (Postgres, Neo4j, an LLM provider) without code changes.
Nothing here is mocked — fill in a `.env` (or real env vars) and the clients
in db/, graph/, and llm/ will connect to your actual services.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str | None = None, required: bool = False) -> str:
    val = os.environ.get(name, default)
    if required and not val:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            f"Set it in your environment or a .env file before running."
        )
    return val


@dataclass(frozen=True)
class PostgresConfig:
    dsn: str = _env("POSTGRES_DSN", "postgresql://medinex:medinex@localhost:5432/medinex")
    pool_min_size: int = int(_env("POSTGRES_POOL_MIN", "1"))
    pool_max_size: int = int(_env("POSTGRES_POOL_MAX", "10"))


@dataclass(frozen=True)
class Neo4jConfig:
    uri: str = _env("NEO4J_URI", "bolt://localhost:7687")
    user: str = _env("NEO4J_USER", "neo4j")
    password: str = _env("NEO4J_PASSWORD", "neo4j_password")
    database: str = _env("NEO4J_DATABASE", "neo4j")


@dataclass(frozen=True)
class LLMConfig:
    provider: str = _env("MEDINEX_LLM_PROVIDER", "anthropic")
    anthropic_api_key: str = _env("ANTHROPIC_API_KEY", "")
    anthropic_model: str = _env("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    max_tokens: int = int(_env("LLM_MAX_TOKENS", "1024"))


@dataclass(frozen=True)
class NLIConfig:
    model_name: str = _env("NLI_MODEL_NAME", "pritamdeka/PubMedBERT-MNLI-MedNLI")
    device: str = _env("NLI_DEVICE", "cpu")  # "cpu" | "cuda" | "mps"
    batch_size: int = int(_env("NLI_BATCH_SIZE", "16"))
    service_host: str = _env("NLI_SERVICE_HOST", "0.0.0.0")
    service_port: int = int(_env("NLI_SERVICE_PORT", "8081"))


POSTGRES = PostgresConfig()
NEO4J = Neo4jConfig()
LLM = LLMConfig()
NLI = NLIConfig()
