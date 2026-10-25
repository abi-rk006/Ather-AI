import re
import os
import logging
from typing import List, Dict, Any, Tuple
from pydantic import BaseModel

logger = logging.getLogger("anna_rag.extractor")

try:
    import pymupdf as fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF (fitz) not available, falling back to pypdf.")

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


class ExtractedPage(BaseModel):
    page_number: int
    text: str
    headings: List[Tuple[str, int]] = []  # (heading_text, estimated_level)


class PDFExtractor:
    """
    Extracts text and hierarchical headings from PDF documents.
    Prefers PyMuPDF (fitz) for font-size-based heading detection.
    """

    HEADING_PATTERNS = [
        (re.compile(r"^(UNIT\s+[IVXLCDM\d]+[:\-]?\s*.*)$", re.IGNORECASE), 1),
        (re.compile(r"^(CHAPTER\s+\d+[:\-]?\s*.*)$", re.IGNORECASE), 1),
        (re.compile(r"^(\d+\.\d+\s+[A-Z].*)$"), 2),
        (re.compile(r"^(\d+\.\d+\.\d+\s+[A-Z].*)$"), 3),
        (re.compile(r"^([A-Z\s]{4,40})$"), 2),  # ALL-CAPS short titles
    ]

    def extract(self, file_path: str) -> List[ExtractedPage]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if PYMUPDF_AVAILABLE:
            try:
                return self._extract_with_pymupdf(file_path)
            except Exception as e:
                logger.warning(f"PyMuPDF failed ({e}), attempting pypdf fallback...")

        if PYPDF_AVAILABLE:
            return self._extract_with_pypdf(file_path)

        raise RuntimeError("Neither PyMuPDF nor pypdf is installed for PDF extraction.")

    def _extract_with_pymupdf(self, file_path: str) -> List[ExtractedPage]:
        pages: List[ExtractedPage] = []
        doc = fitz.open(file_path)

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            text_blocks: List[str] = []
            page_headings: List[Tuple[str, int]] = []

            # Extract detailed block information with font sizes
            blocks = page.get_text("dict", flags=fitz.TEXTFLAGS_SEARCH).get("blocks", [])

            # Calculate average body font size
            font_sizes: List[float] = []
            for b in blocks:
                if b.get("type") == 0:  # Text block
                    for line in b.get("lines", []):
                        for span in line.get("spans", []):
                            t = span.get("text", "").strip()
                            if t and len(t) > 2:
                                font_sizes.append(span.get("size", 10.0))

            avg_font_size = sum(font_sizes) / max(len(font_sizes), 1)

            for b in blocks:
                if b.get("type") == 0:
                    block_text_lines = []
                    for line in b.get("lines", []):
                        line_text = "".join(span.get("text", "") for span in line.get("spans", "")).strip()
                        if not line_text:
                            continue
                        
                        # Check span sizes for prominent headings
                        max_span_size = max((span.get("size", 10.0) for span in line.get("spans", [])), default=10.0)
                        
                        # Font-size heuristic for headings:
                        if max_span_size >= avg_font_size * 1.35 and len(line_text) < 120:
                            level = 1 if max_span_size >= avg_font_size * 1.7 else 2
                            page_headings.append((line_text, level))
                        else:
                            # Regex heuristic
                            for pattern, lvl in self.HEADING_PATTERNS:
                                if pattern.match(line_text) and len(line_text) < 100:
                                    page_headings.append((line_text, lvl))
                                    break

                        block_text_lines.append(line_text)

                    if block_text_lines:
                        text_blocks.append("\n".join(block_text_lines))

            page_full_text = "\n\n".join(text_blocks)
            pages.append(ExtractedPage(page_number=page_num, text=page_full_text, headings=page_headings))

        doc.close()
        return pages

    def _extract_with_pypdf(self, file_path: str) -> List[ExtractedPage]:
        pages: List[ExtractedPage] = []
        reader = pypdf.PdfReader(file_path)

        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            text = page.extract_text() or ""
            page_headings: List[Tuple[str, int]] = []

            for line in text.split("\n"):
                stripped = line.strip()
                if not stripped or len(stripped) > 120:
                    continue
                for pattern, lvl in self.HEADING_PATTERNS:
                    if pattern.match(stripped):
                        page_headings.append((stripped, lvl))
                        break

            pages.append(ExtractedPage(page_number=page_num, text=text, headings=page_headings))

        return pages


class MarkdownExtractor:
    """
    Extracts text and hierarchical headings from Markdown documents.
    """

    def extract(self, file_path: str) -> List[ExtractedPage]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        headings: List[Tuple[str, int]] = []
        for line in content.split("\n"):
            line_str = line.strip()
            if line_str.startswith("### "):
                headings.append((line_str.replace("### ", "").strip(), 3))
            elif line_str.startswith("## "):
                headings.append((line_str.replace("## ", "").strip(), 2))
            elif line_str.startswith("# "):
                headings.append((line_str.replace("# ", "").strip(), 1))

        # Check for multi-page or large markdown sections split by ---
        raw_sections = content.split("\n---\n")
        if len(raw_sections) > 1 and all(len(s.strip()) > 80 for s in raw_sections):
            pages = []
            for p_idx, sec in enumerate(raw_sections, 1):
                sec_headings: List[Tuple[str, int]] = []
                for line in sec.split("\n"):
                    l = line.strip()
                    if l.startswith("#"):
                        lvl = min(l.count("#", 0, 4), 3)
                        sec_headings.append((l.lstrip("# ").strip(), lvl))
                pages.append(ExtractedPage(page_number=p_idx, text=sec.strip(), headings=sec_headings))
            return pages

        return [ExtractedPage(page_number=1, text=content, headings=headings)]


class DocxExtractor:
    """
    Extracts text and hierarchical headings from Word (.docx / .doc) documents.
    """

    def extract(self, file_path: str) -> List[ExtractedPage]:
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = []
            headings: List[Tuple[str, int]] = []
            for p in doc.paragraphs:
                text = p.text.strip()
                if not text:
                    continue
                style_name = p.style.name.lower() if p.style else ""
                if "heading 1" in style_name or "title" in style_name:
                    headings.append((text, 1))
                elif "heading 2" in style_name:
                    headings.append((text, 2))
                elif "heading 3" in style_name:
                    headings.append((text, 3))
                elif text.isupper() and len(text) < 50:
                    headings.append((text, 1))
                paragraphs.append(text)

            full_text = "\n\n".join(paragraphs)
            return [ExtractedPage(page_number=1, text=full_text, headings=headings)]
        except Exception as e:
            logger.warning(f"Word doc extraction fallback: {e}")
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            return [ExtractedPage(page_number=1, text=content, headings=[])]


class CSVExtractor:
    """
    Extracts structured tabular data from CSV files for RAG chunking.
    Preserves column headers across row groups so vector and keyword retrieval
    have complete semantic grounding for each tabular record.
    """

    def __init__(self, rows_per_block: int = 20):
        self.rows_per_block = rows_per_block

    def extract(self, file_path: str) -> List[ExtractedPage]:
        import csv

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            sample = f.read(2048)
            f.seek(0)
            delimiter = ","
            try:
                dialect = csv.Sniffer().sniff(sample)
                delimiter = dialect.delimiter
            except Exception:
                pass

            reader = csv.reader(f, delimiter=delimiter)
            rows = [row for row in reader if any(cell.strip() for cell in row)]

        dataset_title = os.path.splitext(os.path.basename(file_path))[0].replace("_", " ").title()

        if not rows:
            return [ExtractedPage(page_number=1, text=f"# {dataset_title}\n\nEmpty CSV dataset.", headings=[(dataset_title, 1)])]

        headers = [h.strip() for h in rows[0]]
        header_line = " | ".join(headers)
        divider_line = " | ".join(["---"] * len(headers))
        data_rows = rows[1:]

        headings = [
            (f"Dataset: {dataset_title}", 1),
            (f"Columns: {', '.join(headers[:6])}", 2),
        ]

        if not data_rows:
            text = f"# {dataset_title}\n\n| {header_line} |\n| {divider_line} |\n"
            return [ExtractedPage(page_number=1, text=text, headings=headings)]

        pages: List[ExtractedPage] = []
        page_num = 1
        for i in range(0, len(data_rows), self.rows_per_block):
            batch = data_rows[i:i + self.rows_per_block]
            block_lines = [
                f"# {dataset_title} (Records {i + 1} to {i + len(batch)} of {len(data_rows)})",
                f"**Columns:** {', '.join(headers)}\n",
                f"| {header_line} |",
                f"| {divider_line} |",
            ]

            narratives = []
            for r_idx, r in enumerate(batch, i + 1):
                padded_cells = [cell.strip().replace("\n", " ") for cell in r]
                while len(padded_cells) < len(headers):
                    padded_cells.append("")
                block_lines.append(f"| {' | '.join(padded_cells[:len(headers)])} |")

                pairs = [f"{h}: {val}" for h, val in zip(headers, padded_cells) if val]
                if pairs:
                    narratives.append(f"- Record {r_idx}: {', '.join(pairs[:8])}")

            block_text = "\n".join(block_lines) + "\n\n### Record Summaries\n" + "\n".join(narratives)
            block_headings = [(f"Records {i + 1} - {i + len(batch)}", 2)]
            pages.append(ExtractedPage(page_number=page_num, text=block_text, headings=block_headings))
            page_num += 1

        return pages
