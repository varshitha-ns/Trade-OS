"""Small, optional text-vector retrieval helper used by matching and RAG.

The default backend is TF-IDF so the feature does not require a model download.
Set TRADEOS_VECTOR_BACKEND=sentence-transformers to use dense embeddings when
the optional sentence-transformers package and model are available.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List

logger = logging.getLogger(__name__)
_sentence_model = None


def rank_texts(query: str, texts: List[str], top_k: int = 10) -> List[Dict[str, Any]]:
    """Return text indexes ranked by cosine similarity to query.

    Scores are in [0, 1]. Blank or unrelated text is omitted. The caller
    retains responsibility for business-rule filters and final decisions.
    """
    query = str(query or "").strip()
    if not query or not texts:
        return []

    clean_texts = [str(text or "").strip() for text in texts]
    backend = os.getenv("TRADEOS_VECTOR_BACKEND", "tfidf").strip().lower()
    scores = None

    if backend in {"sentence-transformers", "sentence_transformers", "dense"}:
        try:
            global _sentence_model
            if _sentence_model is None:
                from sentence_transformers import SentenceTransformer

                model_name = os.getenv("TRADEOS_SENTENCE_MODEL", "all-MiniLM-L6-v2")
                _sentence_model = SentenceTransformer(model_name)
            import numpy as np

            vectors = _sentence_model.encode([query, *clean_texts], normalize_embeddings=True)
            scores = np.dot(vectors[1:], vectors[0]).tolist()
        except Exception as exc:
            logger.warning("Dense vector search unavailable; using TF-IDF: %s", exc)

    if scores is None:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            vectorizer = TfidfVectorizer(
                lowercase=True,
                strip_accents="unicode",
                ngram_range=(1, 2),
                token_pattern=r"(?u)\b\w+\b",
            )
            matrix = vectorizer.fit_transform([query, *clean_texts])
            scores = cosine_similarity(matrix[1:], matrix[0]).ravel().tolist()
        except ValueError:
            # Empty vocabulary, e.g. punctuation-only input.
            return []

    ranked = [
        {"index": index, "score": max(0.0, min(float(score), 1.0))}
        for index, score in enumerate(scores)
        if float(score) > 0
    ]
    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[: max(0, int(top_k))]
