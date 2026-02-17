"""
Ingest pipeline: load markdown docs → chunk → embed → store in ChromaDB.

The chunking strategy uses character-based splitting with overlap.
Each chunk carries metadata (source filename, chunk index) so the retriever
can tell the agent which policy document the answer came from.
"""

import logging
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

from .config import (
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    CHROMA_COLLECTION,
    CHROMA_PERSIST_DIR,
    EMBEDDING_MODEL,
    POLICIES_DIR,
)

logger = logging.getLogger(__name__)

# ─── Module-level singletons ─────────────────────────────────────────────────

_chroma_client: chromadb.ClientAPI | None = None
_embedding_model: SentenceTransformer | None = None


def get_chroma_client() -> chromadb.ClientAPI:
    """Get or create the ChromaDB client (in-memory or persistent)."""
    global _chroma_client
    if _chroma_client is None:
        if CHROMA_PERSIST_DIR:
            _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
            logger.info(f"ChromaDB persistent client at {CHROMA_PERSIST_DIR}")
        else:
            _chroma_client = chromadb.Client()
            logger.info("ChromaDB in-memory client")
    return _chroma_client


def get_embedding_model() -> SentenceTransformer:
    """Get or create the embedding model (downloads on first use)."""
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Embedding model loaded")
    return _embedding_model


def get_collection() -> chromadb.Collection:
    """Get the ChromaDB collection, creating it if needed."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )


# ─── Chunking ────────────────────────────────────────────────────────────────


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping chunks by character count.

    Strategy: split on paragraph boundaries first (double newline), then
    merge paragraphs into chunks that fit within chunk_size. This preserves
    logical sections better than naive character splitting.
    """
    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks: list[str] = []
    current_chunk = ""

    for paragraph in paragraphs:
        # If adding this paragraph would exceed chunk_size, save current and start new
        if current_chunk and len(current_chunk) + len(paragraph) + 2 > chunk_size:
            chunks.append(current_chunk.strip())
            # Keep overlap from end of current chunk
            if overlap > 0 and len(current_chunk) > overlap:
                current_chunk = current_chunk[-overlap:] + "\n\n" + paragraph
            else:
                current_chunk = paragraph
        else:
            if current_chunk:
                current_chunk += "\n\n" + paragraph
            else:
                current_chunk = paragraph

    # Don't forget the last chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


# ─── Ingestion ────────────────────────────────────────────────────────────────


def load_documents(policies_dir: Path = POLICIES_DIR) -> list[tuple[str, str]]:
    """Load all markdown files from the policies directory.

    Returns list of (filename, content) tuples.
    """
    docs: list[tuple[str, str]] = []
    if not policies_dir.exists():
        logger.warning(f"Policies directory not found: {policies_dir}")
        return docs

    for md_file in sorted(policies_dir.glob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        docs.append((md_file.name, content))
        logger.info(f"Loaded {md_file.name} ({len(content)} chars)")

    return docs


def ingest_documents(policies_dir: Path = POLICIES_DIR) -> tuple[int, int]:
    """
    Full ingest pipeline: load docs → chunk → embed → store.

    Returns (documents_processed, total_chunks).
    Clears existing collection data first for idempotent re-ingestion.
    """
    model = get_embedding_model()
    client = get_chroma_client()

    # Delete and recreate collection for clean re-ingestion
    try:
        client.delete_collection(CHROMA_COLLECTION)
        logger.info(f"Cleared existing collection: {CHROMA_COLLECTION}")
    except Exception:
        pass  # Collection doesn't exist yet

    collection = client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    docs = load_documents(policies_dir)
    if not docs:
        logger.warning("No documents found to ingest")
        return 0, 0

    all_chunks: list[str] = []
    all_ids: list[str] = []
    all_metadatas: list[dict[str, str]] = []

    for filename, content in docs:
        chunks = chunk_text(content)
        for i, chunk in enumerate(chunks):
            chunk_id = f"{filename}::chunk_{i}"
            all_chunks.append(chunk)
            all_ids.append(chunk_id)
            all_metadatas.append({
                "source": filename,
                "chunk_index": str(i),
            })

    # Batch embed all chunks at once (more efficient than one-by-one)
    logger.info(f"Embedding {len(all_chunks)} chunks...")
    embeddings = model.encode(all_chunks, show_progress_bar=False).tolist()

    # Store in ChromaDB
    collection.add(
        ids=all_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadatas,
    )

    logger.info(f"Ingested {len(docs)} documents → {len(all_chunks)} chunks")
    return len(docs), len(all_chunks)
