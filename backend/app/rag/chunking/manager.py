import os
import time
import logging
from typing import Optional, Literal, Tuple, List

from .models import ParentChunk, ChildChunk, ChunkingResult
from .extractors import PDFExtractor, MarkdownExtractor, CSVExtractor, DocxExtractor, ExtractedPage
from .parent_child_chunker import ParentChildChunker
from .student_chunker import StudentChunker
from .store import chunk_store

logger = logging.getLogger("anna_rag.chunk_manager")


class ChunkingManager:
    """
    Unified manager orchestrating structure-aware chunking for Anna University RAG.
    - Predefined Textbooks: Title -> Subtitle -> Subheading Parent Chunks (1000-2000 tokens)
      split into Recursive Child Chunks (300-500 tokens).
    - Student Uploads: Recursive Character Chunking directly on PDF, Markdown, DOCX, and CSV datasets.
    """

    def __init__(self):
        self.pdf_extractor = PDFExtractor()
        self.md_extractor = MarkdownExtractor()
        self.docx_extractor = DocxExtractor()
        self.csv_extractor = CSVExtractor(rows_per_block=20)
        self.textbook_chunker = ParentChildChunker(
            parent_min_tokens=800,
            parent_max_tokens=2000,
            child_chunk_size=400,
            child_chunk_overlap=65,
        )
        self.student_chunker = StudentChunker(
            chunk_size_tokens=400,
            chunk_overlap_tokens=65,
        )
        self.store = chunk_store

    def process_document(
        self,
        file_path: str,
        document_id: str,
        filename: str,
        source_type: Literal["primary_textbook", "student_document"] = "student_document",
        owner_id: str = "system",
        subject_id: Optional[str] = None,
        category: str = "distributed",
    ) -> ChunkingResult:
        start_time = time.time()
        file_ext = filename.split(".")[-1].lower() if "." in filename else "pdf"

        # 1. Content Extraction
        pages: List[ExtractedPage] = []
        if file_ext in ["csv"]:
            pages = self.csv_extractor.extract(file_path)
        elif file_ext in ["md", "markdown", "txt"]:
            pages = self.md_extractor.extract(file_path)
        elif file_ext in ["docx", "doc"]:
            pages = self.docx_extractor.extract(file_path)
        else:
            pages = self.pdf_extractor.extract(file_path)

        parent_chunks: List[ParentChunk] = []
        child_chunks: List[ChildChunk] = []

        # 2. Chunking based on Source Type
        if source_type == "primary_textbook":
            logger.info(f"Applying Structure-Aware Parent-Child chunking on textbook: {filename}")
            parent_chunks, child_chunks = self.textbook_chunker.chunk_textbook(
                pages=pages,
                document_id=document_id,
                book_reference=filename,
                subject_id=subject_id,
            )
        else:
            logger.info(f"Applying Recursive Character chunking on student upload: {filename}")
            child_chunks = self.student_chunker.chunk_student_document(
                pages=pages,
                document_id=document_id,
                filename=filename,
                owner_id=owner_id,
                category=category,
            )

        # 3. Persist Chunks in SQLite Store for cross-session retrieval & parent expansion
        self.store.save_chunks(parent_chunks, child_chunks)

        total_child_tokens = sum(c.token_count for c in child_chunks)
        avg_tokens = total_child_tokens // max(len(child_chunks), 1)
        proc_time = (time.time() - start_time) * 1000

        logger.info(
            f"Chunking complete for {filename}: {len(parent_chunks)} parents, {len(child_chunks)} children in {proc_time:.1f}ms."
        )

        return ChunkingResult(
            document_id=document_id,
            filename=filename,
            source_type=source_type,
            parent_chunks=parent_chunks,
            child_chunks=child_chunks,
            total_parents=len(parent_chunks),
            total_children=len(child_chunks),
            avg_child_tokens=avg_tokens,
            processing_time_ms=proc_time,
        )

    def get_parent_context(self, parent_id: str) -> Optional[ParentChunk]:
        """
        Retrieval Parent Expansion: Fetches full section context using parent_id.
        """
        return self.store.get_parent(parent_id)

    def get_child_chunk(self, chunk_id: str) -> Optional[ChildChunk]:
        return self.store.get_child(chunk_id)


chunking_manager = ChunkingManager()
