import logging
from typing import List, Dict, Any, Union
from .embedding_service import embed_texts
from .vector_store import vector_store
from .bm25_service import bm25_service
from ..rag.chunking.models import ChildChunk

logger = logging.getLogger("anna_rag.indexing")


def _sanitize_metadata(chunk_data: Dict[str, Any]) -> Dict[str, Union[str, int, float, bool]]:
    """
    Chroma metadata requires string, int, float, or bool values.
    Sanitizes None values and complex types.
    """
    return {
        "parent_id": str(chunk_data.get("parent_id") or ""),
        "document_id": str(chunk_data.get("document_id") or ""),
        "subject_id": str(chunk_data.get("subject_id") or "general"),
        "source_type": str(chunk_data.get("source_type") or "primary_textbook"),
        "page_start": int(chunk_data.get("page_start") or 1),
        "page_end": int(chunk_data.get("page_end") or 1),
        "heading_path": str(chunk_data.get("heading_path") or ""),
        "book_reference": str(chunk_data.get("book_reference") or ""),
        "chapter": str(chunk_data.get("chapter") or ""),
    }


class IndexingService:
    """
    Child Chunks Vector Indexing Service.
    Batches child chunks, generates 1024-dim Jina passage embeddings,
    and upserts into Chroma Cloud (or local persistent collection).
    """

    async def index_child_chunks(
        self,
        chunks: List[Union[Dict[str, Any], ChildChunk]],
        batch_size: int = 64,
    ) -> int:
        """
        Embeds child chunks with Jina retrieval.passage and upserts to Chroma Cloud.
        """
        if not chunks:
            return 0

        # Convert ChildChunk models to dicts if needed
        normalized_chunks: List[Dict[str, Any]] = []
        for c in chunks:
            if isinstance(c, ChildChunk):
                normalized_chunks.append({
                    "chunk_id": c.chunk_id,
                    "parent_id": c.parent_id,
                    "document_id": c.document_id,
                    "text": c.text,
                    "subject_id": c.metadata.get("subject_id", "general") if c.metadata else "general",
                    "source_type": c.source_type,
                    "page_start": c.page_start,
                    "page_end": c.page_end,
                    "heading_path": c.heading_path,
                    "book_reference": c.book_reference,
                    "chapter": c.chapter,
                })
            else:
                normalized_chunks.append(c)

        total_chunks = len(normalized_chunks)
        indexed_count = 0
        collection = vector_store.collection

        logger.info(
            f"Beginning vector indexing for {total_chunks} child chunks (batch_size={batch_size})..."
        )

        for start in range(0, total_chunks, batch_size):
            batch = normalized_chunks[start:start + batch_size]
            texts = [chunk["text"] for chunk in batch]

            # Generate Jina embeddings with retrieval.passage task
            vectors = await embed_texts(texts, task="retrieval.passage")

            ids = [chunk["chunk_id"] for chunk in batch]
            metadatas = [_sanitize_metadata(chunk) for chunk in batch]

            # Upsert into Chroma Cloud collection
            collection.upsert(
                ids=ids,
                documents=texts,
                embeddings=vectors,
                metadatas=metadatas,
            )
            indexed_count += len(batch)
            logger.info(f"Indexed batch [{indexed_count}/{total_chunks}] child chunks in Chroma Cloud.")

        # Sync with BM25 Index for Hybrid Search
        try:
            bm25_service.add_chunks(normalized_chunks)
            logger.info(f"Indexed {len(normalized_chunks)} chunks into BM25 keyword index.")
        except Exception as e:
            logger.warning(f"Error indexing chunks into BM25: {e}")

        return indexed_count

    def delete_document_vectors(self, document_id: str) -> None:
        """
        Removes all vectors associated with a document_id from Chroma and BM25.
        """
        try:
            collection = vector_store.collection
            collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted vectors for document_id={document_id} from Chroma collection.")
        except Exception as e:
            logger.warning(f"Error deleting vectors for document {document_id}: {e}")

        try:
            bm25_service.remove_document_chunks(document_id)
            logger.info(f"Deleted BM25 index entries for document_id={document_id}.")
        except Exception as e:
            logger.warning(f"Error removing document {document_id} from BM25: {e}")

    def count(self) -> int:
        """Returns the current vector count in Chroma."""
        return vector_store.count()


# Singleton indexing service instance
indexing_service = IndexingService()
index_child_chunks = indexing_service.index_child_chunks
