"""
FastAPI app — the RAG microservice entry point.

Endpoints:
  POST /search  — query policy documents (called by MCP policy_search tool)
  POST /ingest  — re-ingest policy documents from disk
  GET  /health  — health check with collection stats

On startup, automatically ingests policy documents so the service is
immediately ready to handle search queries.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .config import CHROMA_COLLECTION, EMBEDDING_MODEL, HOST, PORT
from .ingest import ingest_documents, get_collection
from .models import (
    HealthResponse,
    IngestResponse,
    SearchRequest,
    SearchResponse,
)
from .retriever import get_collection_count, search

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ─── Lifespan: auto-ingest on startup ────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ingest policy documents when the service starts."""
    logger.info("Starting RAG service — ingesting policy documents...")
    docs_count, chunks_count = ingest_documents()
    logger.info(f"Ingested {docs_count} documents → {chunks_count} chunks")
    yield
    logger.info("RAG service shutting down")


app = FastAPI(
    title="E-Commerce Policy RAG Service",
    description="Retrieval-Augmented Generation service for e-commerce policy documents",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/search", response_model=SearchResponse)
async def search_policies(request: SearchRequest) -> SearchResponse:
    """
    Search policy documents using semantic similarity.

    This is the main endpoint called by the TypeScript MCP policy_search tool.
    It embeds the query, searches ChromaDB, and returns ranked chunks.
    """
    try:
        results = search(query=request.query, top_k=request.top_k)
        return SearchResponse(
            query=request.query,
            results=results,
            total_chunks=get_collection_count(),
        )
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/ingest", response_model=IngestResponse)
async def ingest_policies() -> IngestResponse:
    """
    Re-ingest policy documents from disk.

    Clears existing chunks and re-processes all markdown files in the
    policies directory. Use this after updating policy documents.
    """
    try:
        docs_count, chunks_count = ingest_documents()
        return IngestResponse(
            documents_processed=docs_count,
            total_chunks=chunks_count,
            message=f"Successfully ingested {docs_count} documents into {chunks_count} chunks",
        )
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check with collection statistics."""
    return HealthResponse(
        status="healthy",
        collection_name=CHROMA_COLLECTION,
        total_chunks=get_collection_count(),
        embedding_model=EMBEDDING_MODEL,
    )


# ─── Direct execution ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=HOST,
        port=PORT,
        reload=True,
    )
