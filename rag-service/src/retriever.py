"""
Retriever: embed a query → cosine similarity search in ChromaDB → return ranked chunks.

This is the "R" in RAG — retrieval. The results are passed back to the
TypeScript agent, which feeds them to the LLM as context for answering
the customer's policy question.
"""

import logging

from .config import DEFAULT_TOP_K
from .ingest import get_collection, get_embedding_model
from .models import ChunkResult

logger = logging.getLogger(__name__)


def search(query: str, top_k: int = DEFAULT_TOP_K) -> list[ChunkResult]:
    """
    Embed the query and retrieve the top-k most similar chunks.

    ChromaDB returns distances (lower = more similar for cosine).
    We convert to similarity scores (higher = better) for the API.
    """
    model = get_embedding_model()
    collection = get_collection()

    if collection.count() == 0:
        logger.warning("Collection is empty — have you run ingest?")
        return []

    # Embed the query
    query_embedding = model.encode([query], show_progress_bar=False).tolist()

    # Query ChromaDB
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    # Build response — convert distance to similarity score
    chunks: list[ChunkResult] = []

    if not results["documents"] or not results["documents"][0]:
        return chunks

    for doc, metadata, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        # ChromaDB cosine distance is in [0, 2]; similarity = 1 - (distance / 2)
        similarity = round(1.0 - (distance / 2.0), 4)

        chunks.append(ChunkResult(
            text=doc,
            source=metadata.get("source", "unknown"),
            score=similarity,
        ))

    logger.info(f"Query: '{query[:60]}...' → {len(chunks)} results (top score: {chunks[0].score if chunks else 'N/A'})")
    return chunks


def get_collection_count() -> int:
    """Return the number of chunks in the collection."""
    return get_collection().count()
