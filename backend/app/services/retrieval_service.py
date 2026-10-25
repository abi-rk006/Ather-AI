import logging
from typing import List, Optional, Dict, Any, Tuple
from .embedding_service import embed_texts
from .vector_store import vector_store
from .bm25_service import bm25_service
from ..models.document import DocumentChunk
from ..models.chat import SearchScope
from ..models.retrieval import (
    RetrievalSearchRequest,
    RetrievalSearchResponse,
    RetrievalResultItem,
    RetrievalSource,
    PaginationModel,
)
from ..rag.chunking.manager import chunking_manager

logger = logging.getLogger("anna_rag.retrieval")

# RRF hyperparameter constant
RRF_K = 60


async def vector_search(
    question: str,
    subject_id: Optional[str] = None,
    source_scope: str = "textbook_and_materials",
    top_k: int = 15,
) -> Dict[str, Any]:
    """
    Search Chroma Cloud using Jina query vector embeddings.
    
    1. Jina generates question vector with task='retrieval.query'.
    2. Chroma Cloud queries cosine nearest neighbors on child chunks.
    3. Filter by subject_id and source_scope (primary_textbook vs student_document).
    """
    collection = vector_store.collection
    if collection.count() == 0:
        logger.debug("Chroma collection is currently empty; returning empty vector query results.")
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    # Step 1: Generate query vector with Jina
    try:
        query_vector = await embed_texts([question], task="retrieval.query")
    except Exception as e:
        logger.error(f"Error generating query vector with Jina: {e}")
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    # Step 2: Construct where clause
    where_conditions = []
    if source_scope in ("textbook_only", "authorized_textbook"):
        where_conditions.append({"source_type": "primary_textbook"})
    elif source_scope in ("materials_only", "my_materials"):
        where_conditions.append({"source_type": "student_document"})

    if subject_id and subject_id != "general":
        where_conditions.append({"subject_id": subject_id})

    where_clause = None
    if len(where_conditions) == 1:
        where_clause = where_conditions[0]
    elif len(where_conditions) > 1:
        where_clause = {"$and": where_conditions}

    # Step 3: Query Chroma Cloud collection
    try:
        results = collection.query(
            query_embeddings=query_vector,
            n_results=min(top_k, max(1, collection.count())),
            where=where_clause,
            include=["documents", "metadatas", "distances"],
        )
        return results
    except Exception as e:
        logger.warning(f"Chroma query with filter {where_clause} failed ({e}), attempting unfiltered query.")
        try:
            return collection.query(
                query_embeddings=query_vector,
                n_results=min(top_k, max(1, collection.count())),
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e2:
            logger.error(f"Unfiltered Chroma query also failed: {e2}")
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}


class RetrievalService:
    """
    Hybrid Retrieval Service connecting Jina AI embeddings,
    Chroma Cloud vector search, BM25 Okapi, Reciprocal Rank Fusion (RRF),
    and Structure-Aware Parent Context Expansion.
    """

    async def search_retrieval_mode(
        self, request: RetrievalSearchRequest
    ) -> RetrievalSearchResponse:
        """
        Retrieval Mode Pipeline:
        1. BM25 keyword matching + Jina query embedding with Chroma Cloud semantic matching.
        2. Reciprocal Rank Fusion (RRF, k=60) combining vector and BM25 candidate ranks.
        3. Deduplication of overlapping child chunks under the same parent section.
        4. Sort by relevance or page order.
        5. Expand parent context on demand.
        6. Paginate and return clean source passage cards (NO LLM generation).
        """
        if not request.query or not request.query.strip():
            return RetrievalSearchResponse(
                query=request.query,
                subject_id=request.subject_id,
                source_scope=request.source_scope,
                results=[],
                pagination=PaginationModel(
                    page=request.page,
                    page_size=request.page_size,
                    total_results=0,
                    total_pages=1,
                    has_more=False,
                ),
            )

        # 1. Semantic Vector Search via Jina + Chroma Cloud
        vector_results = await vector_search(
            question=request.query,
            subject_id=request.subject_id,
            source_scope=request.source_scope,
            top_k=request.top_k,
        )

        v_ids = vector_results.get("ids", [[]])[0]
        v_docs = vector_results.get("documents", [[]])[0]
        v_metas = vector_results.get("metadatas", [[]])[0]

        # 2. BM25 Keyword Search
        bm25_results = bm25_service.search(
            query=request.query,
            subject_id=request.subject_id,
            source_scope=request.source_scope,
            top_k=request.top_k,
        )

        # 3. Reciprocal Rank Fusion (RRF, k=60)
        # Map: chunk_id -> { "chunk": dict, "rrf_score": float, "vec_rank": int, "bm25_rank": int }
        fusion_candidates: Dict[str, Dict[str, Any]] = {}

        for rank, chunk_id in enumerate(v_ids, start=1):
            meta = v_metas[rank - 1] if rank - 1 < len(v_metas) else {}
            doc_text = v_docs[rank - 1] if rank - 1 < len(v_docs) else ""
            score = 1.0 / (RRF_K + rank)

            fusion_candidates[chunk_id] = {
                "chunk_id": chunk_id,
                "text": doc_text,
                "metadata": meta,
                "rrf_score": score,
                "vec_rank": rank,
                "bm25_rank": None,
            }

        for rank, (bm25_chunk, _) in enumerate(bm25_results, start=1):
            cid = bm25_chunk.get("chunk_id")
            if not cid:
                continue

            bm25_score = 1.0 / (RRF_K + rank)
            if cid in fusion_candidates:
                fusion_candidates[cid]["rrf_score"] += bm25_score
                fusion_candidates[cid]["bm25_rank"] = rank
            else:
                meta = {
                    "parent_id": bm25_chunk.get("parent_id", ""),
                    "document_id": bm25_chunk.get("document_id", ""),
                    "subject_id": bm25_chunk.get("subject_id", "general"),
                    "source_type": bm25_chunk.get("source_type", "primary_textbook"),
                    "page_start": bm25_chunk.get("page_start", 1),
                    "page_end": bm25_chunk.get("page_end", 1),
                    "heading_path": bm25_chunk.get("heading_path", ""),
                    "book_reference": bm25_chunk.get("book_reference", ""),
                    "chapter": bm25_chunk.get("chapter", ""),
                }
                fusion_candidates[cid] = {
                    "chunk_id": cid,
                    "text": bm25_chunk.get("text", ""),
                    "metadata": meta,
                    "rrf_score": bm25_score,
                    "vec_rank": None,
                    "bm25_rank": rank,
                }

        # Convert to list and sort by RRF score descending
        candidate_list = list(fusion_candidates.values())
        candidate_list.sort(key=lambda x: x["rrf_score"], reverse=True)

        # 4. Deduplication
        # If overlapping chunks share the same parent_id, retain only the highest-ranked chunk for that parent
        deduped_candidates: List[Dict[str, Any]] = []
        seen_parents = set()

        for cand in candidate_list:
            parent_id = cand["metadata"].get("parent_id")
            if parent_id and parent_id != "":
                if parent_id in seen_parents:
                    continue
                seen_parents.add(parent_id)
            deduped_candidates.append(cand)

        # 5. Sorting
        if request.sort_by == "page_order":
            deduped_candidates.sort(
                key=lambda x: (
                    int(x["metadata"].get("page_start") or 1),
                    -x["rrf_score"],
                )
            )
        else:
            # Default: relevance descending
            deduped_candidates.sort(key=lambda x: x["rrf_score"], reverse=True)

        # 6. Pagination
        total_results = len(deduped_candidates)
        page_size = max(1, request.page_size)
        total_pages = max(1, (total_results + page_size - 1) // page_size)
        current_page = max(1, min(request.page, total_pages))
        start_idx = (current_page - 1) * page_size
        end_idx = start_idx + page_size
        paged_candidates = deduped_candidates[start_idx:end_idx]
        has_more = current_page < total_pages

        # 7. Parent Context Expansion & Result Packaging
        result_items: List[RetrievalResultItem] = []
        for i, item in enumerate(paged_candidates):
            rank_num = start_idx + i + 1
            meta = item["metadata"]
            parent_id = meta.get("parent_id") or None
            parent_text = None

            if parent_id:
                parent_chunk = chunking_manager.get_parent_context(parent_id)
                if parent_chunk:
                    parent_text = parent_chunk.content

            source = RetrievalSource(
                book_title=meta.get("book_reference") or meta.get("heading_path") or "Anna University Prescribed Reference",
                unit=meta.get("chapter") or "Core Unit",
                chapter=meta.get("chapter") or meta.get("heading_path") or "Textbook Section",
                heading_path=meta.get("heading_path") or "",
                page_start=int(meta.get("page_start") or 1),
                page_end=int(meta.get("page_end") or 1),
                document_id=meta.get("document_id") or "doc-live",
                source_type=meta.get("source_type") or "primary_textbook",
            )

            result_items.append(
                RetrievalResultItem(
                    chunk_id=item["chunk_id"],
                    rank=rank_num,
                    rrf_score=round(item["rrf_score"], 5),
                    text=item["text"],
                    parent_id=parent_id,
                    parent_text=parent_text,
                    source=source,
                )
            )

        return RetrievalSearchResponse(
            query=request.query,
            subject_id=request.subject_id,
            source_scope=request.source_scope,
            results=result_items,
            pagination=PaginationModel(
                page=current_page,
                page_size=page_size,
                total_results=total_results,
                total_pages=total_pages,
                has_more=has_more,
            ),
        )

    async def search(
        self,
        query: str,
        search_scope: SearchScope = "textbook_and_materials",
        subject_id: Optional[str] = None,
        top_k: int = 4,
    ) -> List[DocumentChunk]:
        """
        Executes hybrid vector + BM25 search for Exam & Explain modes.
        Returns live DocumentChunk items, or empty list if no matches.
        (NO mock data fallbacks).
        """
        if not query or not query.strip():
            return []

        try:
            req = RetrievalSearchRequest(
                query=query,
                subject_id=subject_id or "general",
                source_scope=search_scope,
                sort_by="relevance",
                page=1,
                page_size=top_k,
                top_k=top_k * 2,
            )
            resp = await self.search_retrieval_mode(req)

            chunks: List[DocumentChunk] = []
            for item in resp.results:
                page_str = (
                    f"pp. {item.source.page_start}-{item.source.page_end}"
                    if item.source.page_start
                    else "Syllabus Passage"
                )
                chunks.append(
                    DocumentChunk(
                        chunk_id=item.chunk_id,
                        document_id=item.source.document_id,
                        doc_title=item.source.book_title,
                        doc_type="pdf" if item.source.source_type == "primary_textbook" else "markdown",
                        page_or_section=page_str,
                        chunk_text=item.text,
                        parent_text=item.parent_text or f"Section Context: {item.source.heading_path}",
                        book_reference=item.source.book_title,
                        chapter=item.source.chapter or item.source.heading_path or "Unit Syllabus",
                        relevance_score=min(0.99, round(item.rrf_score * 50, 2)),
                        topic=item.source.heading_path or item.source.unit or "Course Outcome",
                    )
                )
            return chunks

        except Exception as e:
            logger.warning(f"Hybrid retrieval encountered error: {e}")
            return []

    async def get_chunk_by_id(self, chunk_id: str) -> Optional[DocumentChunk]:
        """
        Inspects a specific chunk and its parent context window.
        Returns None if not found (NO mock fallback).
        """
        child = chunking_manager.get_child_chunk(chunk_id)
        if child:
            parent_text = None
            if child.parent_id:
                parent = chunking_manager.get_parent_context(child.parent_id)
                if parent:
                    parent_text = parent.content

            return DocumentChunk(
                chunk_id=child.chunk_id,
                document_id=child.document_id,
                doc_title=child.book_reference or child.document_id,
                doc_type="pdf" if child.source_type == "primary_textbook" else "markdown",
                page_or_section=f"pp. {child.page_start}-{child.page_end}",
                chunk_text=child.text,
                parent_text=parent_text,
                book_reference=child.book_reference,
                chapter=child.chapter,
                relevance_score=0.95,
                topic=child.heading_path,
            )

        return None


retrieval_service = RetrievalService()
