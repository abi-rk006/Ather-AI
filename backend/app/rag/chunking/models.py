from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class SectionBlock(BaseModel):
    """
    Intermediate structure-aware block extracted from textbooks.
    """
    title: str
    level: int = 1  # 1: Unit/Chapter, 2: Major Section, 3: Subsection
    heading_path: str
    content: str
    page_start: int
    page_end: int


class ParentChunk(BaseModel):
    """
    Parent chunk containing a complete meaningful section/subsection.
    Target size: 1,000 - 2,000 tokens (acts as answer synthesis context).
    """
    parent_id: str
    document_id: str
    title: str
    heading_path: str  # e.g., "Unit 1: Introduction > Section 1.2: Database Architecture"
    content: str
    page_start: int
    page_end: int
    token_count: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ChildChunk(BaseModel):
    """
    Child chunk created by recursive splitting within parent boundaries.
    Target size: 300 - 500 tokens with 50 - 75 token overlap.
    Embedded and indexed in Chroma vector DB & BM25 index for retrieval.
    """
    chunk_id: str
    parent_id: Optional[str] = None  # None for raw student uploads without parent hierarchy
    document_id: str
    text: str
    heading_path: str
    page_start: int
    page_end: int
    token_count: int = 0
    source_type: Literal["primary_textbook", "student_document"] = "primary_textbook"
    book_reference: Optional[str] = None
    chapter: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ChunkingResult(BaseModel):
    """
    Output summary of the document chunking pipeline.
    """
    document_id: str
    filename: str
    source_type: Literal["primary_textbook", "student_document"]
    parent_chunks: List[ParentChunk] = Field(default_factory=list)
    child_chunks: List[ChildChunk] = Field(default_factory=list)
    total_parents: int = 0
    total_children: int = 0
    avg_child_tokens: int = 0
    processing_time_ms: float = 0.0
