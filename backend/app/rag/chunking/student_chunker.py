import logging
from typing import List, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .models import ChildChunk
from .extractors import ExtractedPage

logger = logging.getLogger("anna_rag.student_chunker")


class StudentChunker:
    """
    Recursive Character Chunker for student-uploaded notes, assignments, and presentations.
    Splits text across paragraph and sentence boundaries without assuming textbook heading structure.
    """

    def __init__(
        self,
        chunk_size_tokens: int = 400,     # ~1,600 chars
        chunk_overlap_tokens: int = 65,   # ~260 chars
    ):
        self.chunk_size_chars = chunk_size_tokens * 4
        self.chunk_overlap_chars = chunk_overlap_tokens * 4

        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size_chars,
            chunk_overlap=self.chunk_overlap_chars,
            separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
            keep_separator=True,
            strip_whitespace=True,
        )

    def chunk_student_document(
        self,
        pages: List[ExtractedPage],
        document_id: str,
        filename: str,
        owner_id: str,
        category: str = "distributed",
    ) -> List[ChildChunk]:
        child_chunks: List[ChildChunk] = []
        global_chunk_idx = 1

        for page in pages:
            page_text = page.text.strip()
            if not page_text:
                continue

            # Split page text using recursive character splitter
            splits = self.splitter.split_text(page_text)

            for split in splits:
                text_clean = split.strip()
                if len(text_clean) < 30:
                    continue

                chunk_id = f"{document_id}#c{global_chunk_idx}"
                child_chunks.append(
                    ChildChunk(
                        chunk_id=chunk_id,
                        parent_id=None,  # Student uploads directly use child chunks
                        document_id=document_id,
                        text=text_clean,
                        heading_path=f"Student Notes > {filename}",
                        page_start=page.page_number,
                        page_end=page.page_number,
                        token_count=len(text_clean) // 4,
                        source_type="student_document",
                        book_reference=filename,
                        chapter="Student Upload",
                        metadata={
                            "owner_id": owner_id,
                            "category": category,
                            "chunk_index": global_chunk_idx,
                        }
                    )
                )
                global_chunk_idx += 1

        return child_chunks
