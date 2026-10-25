import re
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .models import SectionBlock, ParentChunk, ChildChunk
from .extractors import ExtractedPage

logger = logging.getLogger("anna_rag.parent_child_chunker")


class ParentChildChunker:
    """
    Structure-aware Parent-Child chunking strategy for authorized Anna University textbooks.
    1. Identifies Title -> Subtitle -> Subheading hierarchy.
    2. Builds complete meaningful parent sections (1,000 - 2,000 tokens).
    3. Recursively splits each parent into child chunks (300 - 500 tokens, 50 - 75 token overlap)
       strictly within the boundaries of that parent section.
    """

    def __init__(
        self,
        parent_min_tokens: int = 800,
        parent_max_tokens: int = 2000,
        child_chunk_size: int = 400,     # Tokens (~1600 characters)
        child_chunk_overlap: int = 65,   # Tokens (~260 characters)
    ):
        self.parent_min_chars = parent_min_tokens * 4
        self.parent_max_chars = parent_max_tokens * 4
        self.child_chunk_size_chars = child_chunk_size * 4
        self.child_chunk_overlap_chars = child_chunk_overlap * 4

        # Recursive text splitter for child chunks within parent boundaries
        self.child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.child_chunk_size_chars,
            chunk_overlap=self.child_chunk_overlap_chars,
            separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
            keep_separator=True,
            strip_whitespace=True,
        )

    def chunk_textbook(
        self,
        pages: List[ExtractedPage],
        document_id: str,
        book_reference: Optional[str] = None,
        subject_id: Optional[str] = None,
    ) -> Tuple[List[ParentChunk], List[ChildChunk]]:
        # 1. Segment pages into meaningful structural section blocks
        sections = self._segment_into_sections(pages)

        parent_chunks: List[ParentChunk] = []
        child_chunks: List[ChildChunk] = []

        # 2. Convert sections into Parent Chunks and derive Child Chunks
        for sec_idx, sec in enumerate(sections, 1):
            parent_id = f"{document_id}#p{sec_idx}"
            parent_text = sec.content.strip()
            if not parent_text:
                continue

            parent_tokens = len(parent_text) // 4
            parent_chunk = ParentChunk(
                parent_id=parent_id,
                document_id=document_id,
                title=sec.title,
                heading_path=sec.heading_path,
                content=parent_text,
                page_start=sec.page_start,
                page_end=sec.page_end,
                token_count=parent_tokens,
                metadata={
                    "subject_id": subject_id,
                    "book_reference": book_reference,
                    "level": sec.level,
                }
            )
            parent_chunks.append(parent_chunk)

            # 3. Create Child Chunks within parent boundaries
            # If the parent is short, keep it intact as a single child
            if len(parent_text) <= self.child_chunk_size_chars * 1.2:
                child_id = f"{parent_id}#c1"
                child_chunks.append(
                    ChildChunk(
                        chunk_id=child_id,
                        parent_id=parent_id,
                        document_id=document_id,
                        text=parent_text,
                        heading_path=sec.heading_path,
                        page_start=sec.page_start,
                        page_end=sec.page_end,
                        token_count=parent_tokens,
                        source_type="primary_textbook",
                        book_reference=book_reference,
                        chapter=sec.title,
                        metadata={
                            "subject_id": subject_id,
                            "parent_token_count": parent_tokens,
                        }
                    )
                )
            else:
                # Recursively split large parent into child chunks
                split_texts = self.child_splitter.split_text(parent_text)
                for child_idx, piece in enumerate(split_texts, 1):
                    piece_clean = piece.strip()
                    if len(piece_clean) < 30:
                        continue

                    child_id = f"{parent_id}#c{child_idx}"
                    child_chunks.append(
                        ChildChunk(
                            chunk_id=child_id,
                            parent_id=parent_id,
                            document_id=document_id,
                            text=piece_clean,
                            heading_path=sec.heading_path,
                            page_start=sec.page_start,
                            page_end=sec.page_end,
                            token_count=len(piece_clean) // 4,
                            source_type="primary_textbook",
                            book_reference=book_reference,
                            chapter=sec.title,
                            metadata={
                                "subject_id": subject_id,
                                "chunk_index": child_idx,
                                "total_children_in_parent": len(split_texts),
                            }
                        )
                    )

        return parent_chunks, child_chunks

    def _segment_into_sections(self, pages: List[ExtractedPage]) -> List[SectionBlock]:
        """
        Groups page content by detected heading boundaries to form coherent sections.
        """
        sections: List[SectionBlock] = []
        current_unit = "General Syllabus"
        current_title = "Introduction"
        current_level = 1
        current_content_lines: List[str] = []
        sec_start_page = 1
        current_page = 1

        for page in pages:
            current_page = page.page_number
            text = page.text

            # If page contains prominent headings, split and transition
            if page.headings:
                for h_text, h_level in page.headings:
                    # Flush accumulated section content if large enough
                    accumulated = "\n".join(current_content_lines).strip()
                    if accumulated and (len(accumulated) >= self.parent_min_chars or h_level <= 2):
                        heading_path = f"{current_unit} > {current_title}" if current_unit != current_title else current_unit
                        sections.append(
                            SectionBlock(
                                title=current_title,
                                level=current_level,
                                heading_path=heading_path,
                                content=accumulated,
                                page_start=sec_start_page,
                                page_end=current_page,
                            )
                        )
                        current_content_lines = []
                        sec_start_page = current_page

                    if h_level == 1:
                        current_unit = h_text
                        current_title = h_text
                        current_level = 1
                    else:
                        current_title = h_text
                        current_level = h_level

            current_content_lines.append(text)

        # Flush final section
        final_accumulated = "\n".join(current_content_lines).strip()
        if final_accumulated:
            heading_path = f"{current_unit} > {current_title}" if current_unit != current_title else current_unit
            sections.append(
                SectionBlock(
                    title=current_title,
                    level=current_level,
                    heading_path=heading_path,
                    content=final_accumulated,
                    page_start=sec_start_page,
                    page_end=current_page,
                )
            )

        return sections
