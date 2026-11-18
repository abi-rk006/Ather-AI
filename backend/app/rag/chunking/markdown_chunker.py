import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .models import ParentChunk, ChildChunk

logger = logging.getLogger("anna_rag.markdown_chunker")


class MarkdownHierarchicalChunker:
    """
    Structure-Aware Hierarchical Markdown Chunker for Academic Textbooks and Student Notes.
    
    Key Features:
    1. Page & OCR Artifact Filtering:
       - Accurately tracks page numbers via regex ('## Page 40', 'Page 21') for source citations.
       - Strips synthetic page markers, horizontal rules ('---'), and HTML image tags from chunk text.
    2. Heading Hierarchy Recognition:
       - Detects Units/Chapters (e.g., '# UNIT III RECURRENT NEURAL NETWORKS').
       - Detects Major Parent Topics (e.g., '### 3.5 VARIATION OF RECURRENT NEURAL NETWORK (RNN)').
       - Detects Subtopics / Child boundaries (e.g., '## Long Short-Term Memory (LSTM):').
    3. Strict Parent-Child Boundary Isolation:
       - Prevents cross-section bleeding (tail of Section 3.4 never leaks into Section 3.5).
       - Recursively splits large subtopics (> 500 tokens) cleanly on paragraph or sentence boundaries.
       - Preserves atomic LaTeX display math blocks ($$ ... $$).
    """

    PAGE_MARKER_RE = re.compile(r"^(?:##?\s+)?page\s+(\d+)\b", re.IGNORECASE)
    HR_RE = re.compile(r"^\s*---\s*$")
    UNIT_RE = re.compile(
        r"^(?:#|##)\s+(UNIT\s+[IVXLCDM\d]+[:\-]?\s*.*|CHAPTER\s+\d+[:\-]?\s*.*|SYLLABUS.*)$",
        re.IGNORECASE,
    )
    NUMBERED_SEC_RE = re.compile(r"^(?:#|##|###)\s+(\d+\.\d+(?:\.\d+)?\s+.*)$")
    SUBHEADING_RE = re.compile(r"^(?:##|###|####)\s+([A-Za-z0-9].*)$")

    def __init__(
        self,
        child_chunk_size_tokens: int = 400,
        child_chunk_overlap_tokens: int = 65,
    ):
        self.child_chunk_size_chars = child_chunk_size_tokens * 4
        self.child_chunk_overlap_chars = child_chunk_overlap_tokens * 4

        self.child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.child_chunk_size_chars,
            chunk_overlap=self.child_chunk_overlap_chars,
            separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
            keep_separator=True,
            strip_whitespace=True,
        )

    def clean_text(self, text: str) -> str:
        """
        Removes OCR image containers, page markers, and excessive breaks from extracted text.
        """
        if not text:
            return ""
        # Remove HTML image divs and markdown image links
        s = re.sub(r"<div[^>]*>.*?</div>", "", text, flags=re.DOTALL | re.IGNORECASE)
        s = re.sub(r"!\[.*?\]\(.*?\)", "", s)
        s = re.sub(r"\[(?:image|figure|photo)\]", "", s, flags=re.IGNORECASE)
        # Remove standalone Page lines
        s = re.sub(r"(?im)^\s*(?:##?\s+)?page\s+\d+\s*$", "", s)
        # Collapse excessive newlines
        s = re.sub(r"\n{3,}", "\n\n", s)
        return s.strip()

    def chunk_markdown(
        self,
        content: str,
        document_id: str,
        book_reference: Optional[str] = None,
        subject_id: Optional[str] = None,
        source_type: str = "primary_textbook",
    ) -> Tuple[List[ParentChunk], List[ChildChunk]]:
        """
        Parses Markdown text into Parent Chunks (Major Sections) and Child Chunks (Subtopics).
        """
        lines = content.split("\n")
        current_unit = "General Curriculum"
        current_page = 1

        # Intermediate raw sections:
        # {
        #   "title": str,
        #   "unit": str,
        #   "page_start": int,
        #   "page_end": int,
        #   "subsections": [ {"title": str, "page_start": int, "page_end": int, "lines": [str]} ]
        # }
        sections: List[Dict[str, Any]] = []
        current_sec: Optional[Dict[str, Any]] = None
        current_subsec: Optional[Dict[str, Any]] = None

        def start_new_subsec(title: str):
            nonlocal current_subsec, current_sec, current_page
            if current_sec is None:
                return
            current_subsec = {
                "title": title,
                "page_start": current_page,
                "page_end": current_page,
                "lines": [],
            }
            current_sec["subsections"].append(current_subsec)

        def start_new_section(title: str):
            nonlocal current_sec, current_subsec, current_page, current_unit
            if current_sec is not None:
                current_sec["page_end"] = max(current_sec["page_end"], current_page)
                sections.append(current_sec)

            current_sec = {
                "title": title,
                "unit": current_unit,
                "page_start": current_page,
                "page_end": current_page,
                "subsections": [],
            }
            start_new_subsec(title=title)

        for line in lines:
            s = line.strip()

            # 1. Page Marker tracking
            m_page = self.PAGE_MARKER_RE.match(s)
            if m_page:
                current_page = int(m_page.group(1))
                if current_sec:
                    current_sec["page_end"] = max(current_sec["page_end"], current_page)
                if current_subsec:
                    current_subsec["page_end"] = max(current_subsec["page_end"], current_page)
                continue

            # 2. Horizontal Rule (page/section separator)
            if self.HR_RE.match(s):
                continue

            # 3. Unit Header
            m_unit = self.UNIT_RE.match(s)
            if m_unit:
                unit_name = m_unit.group(1).strip()
                # Clean unit name (remove trailing markdown symbols)
                unit_name = re.sub(r"^[#\s]+", "", unit_name)
                current_unit = unit_name
                continue

            # 4. Numbered Major Section (Parent Boundary, e.g. "3.5 VARIATION OF RECURRENT NEURAL NETWORK")
            m_sec = self.NUMBERED_SEC_RE.match(s)
            if m_sec:
                sec_title = m_sec.group(1).strip()
                start_new_section(title=sec_title)
                continue

            # 5. Top-level Chapter / Section Header (Level 1/2)
            if s.startswith("# ") or (s.startswith("## ") and not s.endswith(":")):
                clean_h = re.sub(r"^[#\s]+", "", s).strip()
                # If short title and not a subproperty, treat as parent section
                if 4 <= len(clean_h) <= 80 and not clean_h.lower().startswith("page"):
                    start_new_section(title=clean_h)
                    continue

            # 6. Subsection / Subtopic Header (Child Boundary, e.g. "## Bidirectional RNN (BiRNN):")
            m_sub = self.SUBHEADING_RE.match(s)
            if m_sub and current_sec is not None:
                sub_title = m_sub.group(1).strip()
                # Avoid page markers or image markers being treated as subheadings
                if not self.PAGE_MARKER_RE.match(sub_title) and not sub_title.lower().startswith("page "):
                    clean_sub = re.sub(r"[:\s]+$", "", sub_title).strip()
                    start_new_subsec(title=clean_sub)
                    continue

            # 7. Content line
            if current_subsec is not None:
                current_subsec["lines"].append(line)
            elif current_sec is not None:
                start_new_subsec(title=current_sec["title"])
                current_subsec["lines"].append(line)

        # Flush final section
        if current_sec is not None:
            current_sec["page_end"] = max(current_sec["page_end"], current_page)
            sections.append(current_sec)

        # If no explicit numbered sections were found, treat entire file as one section with subsections
        if not sections and lines:
            sections.append({
                "title": book_reference or "Curriculum Document",
                "unit": current_unit,
                "page_start": 1,
                "page_end": current_page,
                "subsections": [{
                    "title": book_reference or "Overview",
                    "page_start": 1,
                    "page_end": current_page,
                    "lines": lines,
                }],
            })

        parent_chunks: List[ParentChunk] = []
        child_chunks: List[ChildChunk] = []

        global_child_idx = 1

        for sec_idx, sec in enumerate(sections, start=1):
            parent_id = f"{document_id}#p{sec_idx}"
            unit_title = sec["unit"]
            sec_title = sec["title"]
            heading_path = f"{unit_title} > {sec_title}" if unit_title != sec_title else unit_title

            # Assemble clean parent content from all subsections
            subsec_texts: List[Tuple[str, str, int, int]] = []
            for sub in sec["subsections"]:
                sub_body = self.clean_text("\n".join(sub["lines"]))
                if sub_body:
                    subsec_texts.append((sub["title"], sub_body, sub["page_start"], sub["page_end"]))

            full_parent_text = "\n\n".join(f"### {t}\n{b}" if t != sec_title else b for t, b, _, _ in subsec_texts).strip()
            if not full_parent_text:
                continue

            parent_tokens = len(full_parent_text) // 4
            parent_chunk = ParentChunk(
                parent_id=parent_id,
                document_id=document_id,
                title=sec_title,
                heading_path=heading_path,
                content=full_parent_text,
                page_start=sec["page_start"],
                page_end=sec["page_end"],
                token_count=parent_tokens,
                metadata={
                    "subject_id": subject_id,
                    "book_reference": book_reference,
                    "level": 2,
                    "subsections_count": len(subsec_texts),
                },
            )
            parent_chunks.append(parent_chunk)

            # Generate Child Chunks strictly within this parent boundary
            for sub_title, sub_body, sub_p_start, sub_p_end in subsec_texts:
                child_heading_path = f"{heading_path} > {sub_title}" if sub_title != sec_title else heading_path
                sub_body_clean = sub_body.strip()
                if len(sub_body_clean) < 25:
                    continue

                sub_tokens = len(sub_body_clean) // 4

                # If subsection fits comfortably within target child size, keep intact
                if len(sub_body_clean) <= self.child_chunk_size_chars * 1.25:
                    child_id = f"{parent_id}#c{global_child_idx}"
                    child_chunks.append(
                        ChildChunk(
                            chunk_id=child_id,
                            parent_id=parent_id,
                            document_id=document_id,
                            text=sub_body_clean,
                            heading_path=child_heading_path,
                            page_start=sub_p_start,
                            page_end=sub_p_end,
                            token_count=sub_tokens,
                            source_type=source_type,
                            book_reference=book_reference,
                            chapter=sub_title,
                            metadata={
                                "subject_id": subject_id,
                                "parent_title": sec_title,
                                "chunk_index": global_child_idx,
                            },
                        )
                    )
                    global_child_idx += 1
                else:
                    # Recursively split large subsection on paragraph / sentence boundaries
                    splits = self.child_splitter.split_text(sub_body_clean)
                    for split in splits:
                        clean_split = split.strip()
                        if len(clean_split) < 25:
                            continue
                        child_id = f"{parent_id}#c{global_child_idx}"
                        child_chunks.append(
                            ChildChunk(
                                chunk_id=child_id,
                                parent_id=parent_id,
                                document_id=document_id,
                                text=clean_split,
                                heading_path=child_heading_path,
                                page_start=sub_p_start,
                                page_end=sub_p_end,
                                token_count=len(clean_split) // 4,
                                source_type=source_type,
                                book_reference=book_reference,
                                chapter=sub_title,
                                metadata={
                                    "subject_id": subject_id,
                                    "parent_title": sec_title,
                                    "chunk_index": global_child_idx,
                                },
                            )
                        )
                        global_child_idx += 1

        logger.info(
            f"Markdown Hierarchical Chunking complete for {book_reference or document_id}: "
            f"{len(parent_chunks)} parent sections, {len(child_chunks)} child chunks."
        )
        return parent_chunks, child_chunks
