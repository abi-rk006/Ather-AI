from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime


SourceType = Literal["primary_textbook", "student_document"]
ProcessingStatus = Literal["queued", "processing", "indexed", "failed"]


class DocumentMetadata(BaseModel):
    document_id: str
    owner_id: str  # userId or "system" for predefined textbooks
    subject_id: Optional[str] = None
    filename: str
    file_type: str = "pdf"
    category: str = "distributed"
    source_type: SourceType = "student_document"
    storage_path: str
    processing_status: ProcessingStatus = "indexed"
    size_bytes: int = 0
    chunk_count: int = 0
    parent_chunk_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    summary: Optional[str] = None


class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    doc_title: str
    doc_type: str = "pdf"
    page_or_section: str
    chunk_text: str
    parent_text: Optional[str] = None
    book_reference: Optional[str] = None
    chapter: Optional[str] = None
    relevance_score: float = 0.95
    topic: Optional[str] = None
