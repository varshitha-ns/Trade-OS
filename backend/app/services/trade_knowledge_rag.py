"""Opt-in retrieval-augmented answers over curated trade knowledge chunks."""

from __future__ import annotations

import json
import os
from datetime import date
from typing import Any, Dict

from app.database import get_database
from app.models.document_agent import TradeContext
from app.services.vector_retrieval import rank_texts


def _enabled() -> bool:
    return os.getenv("TRADE_RAG_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}


def _is_applicable(chunk: Dict[str, Any], context: TradeContext) -> bool:
    metadata = chunk.get("metadata") or {}
    importer = str(metadata.get("importer_country", "global")).strip().lower()
    if importer not in {"", "global", context.importer_country.strip().lower()}:
        return False

    exporter = str(metadata.get("exporter_country", "global")).strip().lower()
    if exporter not in {"", "global", context.exporter_country.strip().lower()}:
        return False

    hs_prefixes = metadata.get("hs_code_prefixes") or metadata.get("hs_code_prefix")
    if isinstance(hs_prefixes, str):
        hs_prefixes = [hs_prefixes]
    if hs_prefixes:
        normalized_hs = "".join(ch for ch in context.hs_code if ch.isdigit())
        if not any(normalized_hs.startswith(str(prefix)) for prefix in hs_prefixes):
            return False

    # Optional validity bounds let curators exclude superseded guidance.
    today = date.today()
    valid_from = metadata.get("valid_from")
    valid_to = metadata.get("valid_to")
    try:
        if valid_from and today < date.fromisoformat(str(valid_from)[:10]):
            return False
        if valid_to and today > date.fromisoformat(str(valid_to)[:10]):
            return False
    except ValueError:
        # Bad dates should not make a request fail; curator should correct the chunk.
        return False
    return True


async def answer_trade_knowledge_question(context: TradeContext) -> Dict[str, Any]:
    """Retrieve applicable source chunks and ask Gemini to answer from them.

    This endpoint is deliberately separate from the existing document-package
    workflow. It returns cited research for review and never changes package
    contents or compliance status.
    """
    if not _enabled():
        return {
            "enabled": False,
            "answer": None,
            "sources": [],
            "message": "Trade RAG is disabled. Set TRADE_RAG_ENABLED=true to enable it.",
        }

    db = get_database()
    if db is None:
        return {"enabled": True, "answer": None, "sources": [], "message": "Database not connected."}

    collection_name = os.getenv("TRADE_KNOWLEDGE_COLLECTION", "trade_knowledge_chunks")
    chunks = await db[collection_name].find({}).limit(2000).to_list(length=2000)
    applicable = [chunk for chunk in chunks if _is_applicable(chunk, context)]
    query = (
        f"Trade document requirements: {context.product_name}; category {context.product_category}; "
        f"HS code {context.hs_code}; exporter country {context.exporter_country}; "
        f"importer country {context.importer_country}; shipping {context.logistics_mode}; "
        f"delivery terms {context.delivery_terms}; payment terms {context.payment_terms}."
    )
    ranked = rank_texts(query, [str(chunk.get("text", "")) for chunk in applicable], top_k=5)
    selected = [applicable[item["index"]] for item in ranked]
    if not selected:
        return {
            "enabled": True,
            "answer": None,
            "sources": [],
            "message": "No applicable knowledge chunks found. Ingest trusted, current trade sources first.",
        }

    sources = []
    context_blocks = []
    for number, chunk in enumerate(selected, start=1):
        source = chunk.get("source") or {}
        source_id = f"S{number}"
        sources.append({
            "citation_id": source_id,
            "title": source.get("title", "Untitled source"),
            "url": source.get("url"),
            "section": source.get("section"),
            "effective_date": source.get("effective_date"),
            "similarity": round(ranked[number - 1]["score"], 4),
        })
        context_blocks.append(
            f"[{source_id}] {source.get('title', 'Untitled source')} | "
            f"section={source.get('section', 'unspecified')} | "
            f"effective_date={source.get('effective_date', 'unspecified')}\n"
            f"{chunk.get('text', '')}"
        )

    try:
        from dotenv import load_dotenv

        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"enabled": True, "answer": None, "sources": sources, "message": "GEMINI_API_KEY is not configured."}
        os.environ["GOOGLE_API_KEY"] = api_key
        from langchain_google_genai import ChatGoogleGenerativeAI

        model = ChatGoogleGenerativeAI(model=os.getenv("TRADE_RAG_MODEL", "gemini-2.5-flash"), temperature=0)
        public_trade_context = {
            key: getattr(context, key)
            for key in (
                "product_name", "product_category", "hs_code", "exporter_country",
                "importer_country", "logistics_mode", "delivery_terms", "payment_terms",
            )
        }
        prompt = f"""Answer the trade-document question using only the source excerpts below.
If the excerpts do not establish an answer, say that the sources are insufficient.
Do not present this as a final legal/compliance decision. Cite claims with the
provided IDs, such as [S1]. Do not invent citations.

Trade context: {json.dumps(public_trade_context, default=str)}
Question: Which documents or trade requirements should be reviewed for this trade?

Source excerpts:
{chr(10).join(context_blocks)}"""
        response = model.invoke(prompt)
        answer = response.content
        if isinstance(answer, list):
            answer = " ".join(block.get("text", "") for block in answer if isinstance(block, dict))
        return {"enabled": True, "answer": str(answer), "sources": sources, "message": "Review cited sources before acting."}
    except Exception as exc:
        return {
            "enabled": True,
            "answer": None,
            "sources": sources,
            "message": f"RAG generation unavailable: {exc.__class__.__name__}",
        }
