from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class RetrievalSource(BaseModel):
    book_title: str
    unit: Optional[str] = None
    chapter: Optional[str] = None
    heading_path: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    document_id: str
    source_type: str = "primary_textbook"


class RetrievalResultItem(BaseModel):
    chunk_id: str
    rank: int
    rrf_score: float
    text: str
    parent_id: Optional[str] = None
    parent_text: Optional[str] = None
    source: RetrievalSource


class PaginationModel(BaseModel):
    page: int = 1
    page_size: int = 5
    total_results: int = 0
    total_pages: int = 1
    has_more: bool = False


class RetrievalSearchRequest(BaseModel):
    query: str
    subject_id: Optional[str] = "general"
    source_scope: str = "authorized_textbook"  # "authorized_textbook" | "textbook_and_materials" | "my_materials"
    sort_by: Literal["relevance", "page_order"] = "relevance"
    page: int = 1
    page_size: int = 5
    top_k: int = 15


class RetrievalSearchResponse(BaseModel):
    query: str
    subject_id: Optional[str] = None
    source_scope: str = "authorized_textbook"
    results: List[RetrievalResultItem] = Field(default_factory=list)
    pagination: PaginationModel
