"""Ingest reviewed, pre-chunked trade knowledge from JSON Lines into MongoDB.

Run from backend/: python ingest_trade_knowledge.py path\to\reviewed_chunks.jsonl
Each line: {"text": "...", "source": {"title": "...", "url": "...",
"section": "...", "effective_date": "..."}, "metadata": {"importer_country":
"...", "exporter_country": "...", "hs_code_prefixes": ["09"]}}

Only ingest sources your team has reviewed and is authorized to use. This script
does not download, interpret, or certify regulations.
"""

import argparse
import asyncio
import hashlib
import json
from pathlib import Path

from app.database import close_mongo_connection, connect_to_mongo, get_database


def read_chunks(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            chunk = json.loads(line)
            if not str(chunk.get("text", "")).strip():
                raise ValueError(f"Line {line_number}: text is required")
            chunk["text"] = str(chunk["text"]).strip()
            source = chunk.get("source") or {}
            if not source.get("title") or not source.get("url"):
                raise ValueError(f"Line {line_number}: source.title and source.url are required")
            source["title"] = str(source["title"])
            source["url"] = str(source["url"])
            stable = "|".join((source["url"], str(source.get("section", "")), chunk["text"]))
            chunk["_id"] = hashlib.sha256(stable.encode("utf-8")).hexdigest()
            chunk["metadata"] = chunk.get("metadata") or {}
            yield chunk


async def ingest(path: Path):
    await connect_to_mongo()
    try:
        collection = get_database()["trade_knowledge_chunks"]
        count = 0
        for chunk in read_chunks(path):
            chunk_id = chunk.pop("_id")
            await collection.update_one({"_id": chunk_id}, {"$set": chunk}, upsert=True)
            count += 1
        print(f"Upserted {count} reviewed chunks into trade_knowledge_chunks.")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("jsonl_file", type=Path)
    args = parser.parse_args()
    asyncio.run(ingest(args.jsonl_file))
