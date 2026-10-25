from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.retrieval import RetrievalSearchRequest, RetrievalSearchResponse
from ..models.document import DocumentChunk
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.retrieval_service import retrieval_service
from ..rag.chunking.manager import chunking_manager

router = APIRouter(prefix="/api/retrieval", tags=["Retrieval Mode"])


@router.post("/search", response_model=RetrievalSearchResponse)
async def search_retrieval_passages(
    request: RetrievalSearchRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Dedicated Retrieval Mode search endpoint:
    - Hybrid BM25 keyword + Jina query vector search over Chroma Cloud.
    - Reciprocal Rank Fusion (RRF, k=60).
    - Deduplication of overlapping child chunks.
    - Exact verbatim original text passages with book, chapter, and page citations.
    - NO LLM text generation.
    """
    return await retrieval_service.search_retrieval_mode(request)


@router.get("/parent/{parent_id}")
async def get_parent_context(
    parent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Fetches the surrounding parent section context for a child chunk.
    """
    parent = chunking_manager.get_parent_context(parent_id)
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent context with ID {parent_id} not found.",
        )
    return {
        "parent_id": parent.parent_id,
        "document_id": parent.document_id,
        "title": parent.title,
        "heading_path": parent.heading_path,
        "content": parent.content,
        "page_start": parent.page_start,
        "page_end": parent.page_end,
        "token_count": parent.token_count,
    }


@router.get("/chunk/{chunk_id}", response_model=DocumentChunk)
async def get_chunk_details(
    chunk_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Fetches child chunk details and parent text window.
    """
    chunk = await retrieval_service.get_chunk_by_id(chunk_id)
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chunk {chunk_id} not found.",
        )
    return chunk
