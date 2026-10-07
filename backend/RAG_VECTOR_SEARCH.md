# Optional RAG and vector matching

Both features are off by default, so existing matching and document-package behavior is unchanged.

## Buyer matching

- Set `BUYER_MATCH_VECTOR_SEARCH_ENABLED=true` to add a text-vector similarity signal to buyer matching.
- `TRADEOS_VECTOR_BACKEND=tfidf` is the dependency-light default. It is lexical TF-IDF vector similarity, not a dense semantic embedding.
- For dense embeddings, install the optional `sentence-transformers` package and set `TRADEOS_VECTOR_BACKEND=sentence-transformers`. The model name defaults to `all-MiniLM-L6-v2` and can be changed with `TRADEOS_SENTENCE_MODEL`.
- `BUYER_MATCH_VECTOR_MIN_SCORE` sets the minimum similarity (default `0.15`) for vector-only candidates. Existing HS-code, volume, threshold, and explanation scoring still runs.

## Trade knowledge RAG

- Set `TRADE_RAG_ENABLED=true` to enable `POST /api/document-agent/requirements/rag`.
- This endpoint retrieves text chunks from MongoDB collection `trade_knowledge_chunks`, then asks Gemini to answer from the retrieved excerpts and returns their source metadata.
- Set `TRADE_KNOWLEDGE_COLLECTION` to use another collection and `TRADE_RAG_MODEL` to select a configured Gemini model. `GEMINI_API_KEY` is required for generation.
- The endpoint is supplemental: it does not alter the existing document workflow or verification status. Treat its answer as a cited review aid, not a final compliance determination.

### Ingesting knowledge

Prepare a JSONL file containing reviewed and legally usable source chunks. Each row must have `text` and `source.title` and `source.url`. Optional source fields include `section` and `effective_date`; optional `metadata` fields include `importer_country`, `exporter_country`, and `hs_code_prefixes`.

From `backend/`, run with the project virtual environment:

```powershell
..\.venv\Scripts\python.exe ingest_trade_knowledge.py path\to\reviewed_chunks.jsonl
```

The project does not include an authoritative trade-regulation corpus. Do not ingest generated documents, user KYC files, or unreviewed material as regulatory sources.
