"""
Step 7.3 — NLI Engine

A standalone microservice. Run with:
    uvicorn nli.nli_service:app --host 0.0.0.0 --port 8081

Loads a biomedical NLI model (default: a PubMedBERT/MedNLI fine-tune —
swap config.NLI.model_name for BioLinkBERT-NLI or a DeBERTa biomedical
checkpoint as needed) and exposes POST /infer matching the contract in
the architecture doc.

NOTE: model download requires real network access to the model hub at
deploy time — this code is correct and will run as-is once you deploy it
somewhere with that access; it isn't executed in this sandbox.
"""
from __future__ import annotations

from functools import lru_cache

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config

app = FastAPI(title="Medinex NLI Engine", version="1.0")


class InferRequest(BaseModel):
    premise: str
    hypothesis: str


class InferResponse(BaseModel):
    label: str
    confidence: float
    scores: dict[str, float]


@lru_cache(maxsize=1)
def _get_model_and_tokenizer():
    tokenizer = AutoTokenizer.from_pretrained(config.NLI.model_name)
    model = AutoModelForSequenceClassification.from_pretrained(config.NLI.model_name)
    model.to(config.NLI.device)
    model.eval()
    return model, tokenizer


def _label_map(model) -> dict[int, str]:
    """
    Most NLI checkpoints expose id2label, but label sets/order vary
    (entailment/neutral/contradiction ordering differs across MNLI-style
    fine-tunes). Normalize to our three canonical labels by substring match
    on whatever the checkpoint calls them.
    """
    id2label = model.config.id2label
    normalized = {}
    for idx, name in id2label.items():
        lname = name.lower()
        if "contra" in lname:
            normalized[idx] = "contradiction"
        elif "entail" in lname:
            normalized[idx] = "entailment"
        else:
            normalized[idx] = "neutral"
    return normalized


@app.post("/infer", response_model=InferResponse)
def infer(req: InferRequest) -> InferResponse:
    model, tokenizer = _get_model_and_tokenizer()
    labels = _label_map(model)

    inputs = tokenizer(
        req.premise, req.hypothesis,
        return_tensors="pt", truncation=True, max_length=256,
    ).to(config.NLI.device)

    with torch.no_grad():
        logits = model(**inputs).logits[0]
        probs = torch.softmax(logits, dim=-1)

    scores = {labels[i]: float(probs[i]) for i in range(len(probs))}
    best_idx = int(torch.argmax(probs))
    return InferResponse(
        label=labels[best_idx],
        confidence=float(probs[best_idx]),
        scores=scores,
    )


@app.get("/health")
def health():
    return {"status": "ok", "model": config.NLI.model_name}
