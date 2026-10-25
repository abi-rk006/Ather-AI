import logging
import re
from typing import List, Dict, Any, Optional, Tuple, Union
import math
from rank_bm25 import BM25Okapi
from ..rag.chunking.models import ChildChunk

logger = logging.getLogger("anna_rag.bm25")


class RobustBM25(BM25Okapi):
    """
    BM25Okapi with Robertson-Jones non-negative IDF: ln(1 + (N - n + 0.5)/(n + 0.5)).
    Guarantees non-negative term weights across small and large corpora alike.
    """
    def _calc_idf(self, nd):
        for word, freq in nd.items():
            self.idf[word] = math.log(1.0 + (self.corpus_size - freq + 0.5) / (freq + 0.5))


def _tokenize(text: str) -> List[str]:
    """Simple alphanumeric tokenizer for BM25 keyword matching."""
    return [word.lower() for word in re.findall(r"\w+", text) if len(word) > 1]


class BM25IndexService:
    """
    In-memory BM25 Okapi index over child chunks.
    Works in conjunction with Chroma Cloud for hybrid RRF retrieval.
    """

    def __init__(self):
        self._corpus_chunks: List[Dict[str, Any]] = []
        self._tokenized_corpus: List[List[str]] = []
        self._bm25_index: Optional[RobustBM25] = None

    def add_chunks(self, chunks: List[Union[Dict[str, Any], ChildChunk]]) -> None:
        """Adds and indexes a list of child chunks into the BM25 model."""
        if not chunks:
            return

        new_count = 0
        for c in chunks:
            if isinstance(c, ChildChunk):
                chunk_dict = {
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
                }
            else:
                chunk_dict = dict(c)

            # Avoid duplicate chunk IDs in index
            if not any(item["chunk_id"] == chunk_dict["chunk_id"] for item in self._corpus_chunks):
                self._corpus_chunks.append(chunk_dict)
                tokens = _tokenize(chunk_dict.get("text", ""))
                self._tokenized_corpus.append(tokens)
                new_count += 1

        if new_count > 0 and self._tokenized_corpus:
            self._bm25_index = RobustBM25(self._tokenized_corpus)
            logger.info(f"BM25 index rebuilt. Total indexed documents: {len(self._corpus_chunks)} (+{new_count} new).")

    def search(
        self,
        query: str,
        subject_id: Optional[str] = None,
        source_scope: str = "authorized_textbook",
        top_k: int = 15,
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Executes BM25 keyword matching over child chunks.
        Filters by subject_id and source_scope.
        Returns sorted list of (chunk_dict, score) tuples.
        """
        if not self._bm25_index or not self._corpus_chunks:
            return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        doc_scores = self._bm25_index.get_scores(query_tokens)
        scored_results: List[Tuple[Dict[str, Any], float]] = []

        for idx, score in enumerate(doc_scores):
            if score <= 0:
                continue

            chunk = self._corpus_chunks[idx]

            # Apply scope filter
            src_type = chunk.get("source_type", "")
            if source_scope == "authorized_textbook" and src_type not in ("primary_textbook", "authorized_textbook"):
                continue
            elif source_scope in ("my_materials", "materials_only") and src_type != "student_document":
                continue

            # Apply subject filter if specified
            if subject_id and subject_id != "general" and chunk.get("subject_id") not in (subject_id, "general", None):
                continue

            scored_results.append((chunk, float(score)))

        # Sort descending by BM25 score
        scored_results.sort(key=lambda x: x[1], reverse=True)
        return scored_results[:top_k]

    def remove_document_chunks(self, document_id: str) -> None:
        """Removes all chunks belonging to document_id from the BM25 index."""
        indices_to_keep = [i for i, c in enumerate(self._corpus_chunks) if c.get("document_id") != document_id]
        self._corpus_chunks = [self._corpus_chunks[i] for i in indices_to_keep]
        self._tokenized_corpus = [self._tokenized_corpus[i] for i in indices_to_keep]

        if self._tokenized_corpus:
            self._bm25_index = RobustBM25(self._tokenized_corpus)
        else:
            self._bm25_index = None

    def count(self) -> int:
        return len(self._corpus_chunks)


bm25_service = BM25IndexService()
