"""
Pydantic request/response models — the API contract.
The TypeScript policy_search tool sends SearchRequest and expects SearchResponse.
"""

from pydantic import BaseModel, Field


# ─── Search ───────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    """Incoming search query from the MCP policy_search tool."""
    query: str = Field(..., description="Natural language question about policies", min_length=1)
    top_k: int = Field(default=3, description="Number of chunks to return", ge=1, le=10)


class ChunkResult(BaseModel):
    """A single retrieved chunk with metadata."""
    text: str = Field(..., description="The chunk text content")
    source: str = Field(..., description="Source document filename")
    score: float = Field(..., description="Similarity score (0-1, higher is better)")


class SearchResponse(BaseModel):
    """Response containing ranked chunks from the vector store."""
    query: str
    results: list[ChunkResult]
    total_chunks: int = Field(..., description="Total chunks in the collection")


# ─── Ingest ───────────────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    """Response after ingesting/re-ingesting policy documents."""
    documents_processed: int
    total_chunks: int
    message: str


# ─── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    collection_name: str
    total_chunks: int
    embedding_model: str
