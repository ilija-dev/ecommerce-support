"""
Configuration for the RAG microservice.
All settings in one place — chunking params, embedding model, ChromaDB collection.
"""

import os
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent
POLICIES_DIR = BASE_DIR / "data" / "policies"

# ─── Embedding Model ─────────────────────────────────────────────────────────
# all-MiniLM-L6-v2: 384-dim embeddings, fast, good quality for semantic search.
# Downloads ~80MB on first run, then cached locally.

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# ─── Chunking ────────────────────────────────────────────────────────────────
# 500 chars ≈ ~100 tokens — small enough for precise retrieval,
# large enough to preserve context. 50-char overlap prevents info loss
# at chunk boundaries.

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))

# ─── ChromaDB ────────────────────────────────────────────────────────────────

CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "ecommerce_policies")

# persist_directory: set to None for in-memory (default for dev/demo),
# or a path string for persistent storage.
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", None)

# ─── Retrieval ────────────────────────────────────────────────────────────────

DEFAULT_TOP_K = int(os.getenv("DEFAULT_TOP_K", "3"))

# ─── Server ───────────────────────────────────────────────────────────────────

HOST = os.getenv("RAG_HOST", "0.0.0.0")
PORT = int(os.getenv("RAG_PORT", "8000"))
