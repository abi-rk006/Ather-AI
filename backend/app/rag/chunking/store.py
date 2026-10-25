import os
import json
import sqlite3
import logging
from typing import Optional, List, Dict, Any
from .models import ParentChunk, ChildChunk
from ...config import settings

logger = logging.getLogger("anna_rag.chunk_store")


class ChunkStore:
    """
    Persistent SQLite storage for Parent and Child chunks.
    Ensures parent context records persist across restarts for parent expansion.
    """

    def __init__(self, db_path: Optional[str] = None):
        if not db_path:
            chunks_dir = os.path.join(settings.STORAGE_DIR, "chunks")
            os.makedirs(chunks_dir, exist_ok=True)
            db_path = os.path.join(chunks_dir, "rag_chunks.db")

        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Enable WAL mode for high read/write concurrency
            cursor.execute("PRAGMA journal_mode=WAL;")

            # 1. Parent Chunks Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parent_chunks (
                    parent_id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    heading_path TEXT NOT NULL,
                    content TEXT NOT NULL,
                    page_start INTEGER,
                    page_end INTEGER,
                    token_count INTEGER,
                    metadata_json TEXT
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_parent_doc ON parent_chunks (document_id);")

            # 2. Child Chunks Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS child_chunks (
                    chunk_id TEXT PRIMARY KEY,
                    parent_id TEXT,
                    document_id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    heading_path TEXT,
                    page_start INTEGER,
                    page_end INTEGER,
                    token_count INTEGER,
                    source_type TEXT,
                    book_reference TEXT,
                    chapter TEXT,
                    metadata_json TEXT,
                    FOREIGN KEY (parent_id) REFERENCES parent_chunks (parent_id) ON DELETE CASCADE
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_child_doc ON child_chunks (document_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_child_parent ON child_chunks (parent_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_child_source ON child_chunks (source_type);")

            conn.commit()

    def save_chunks(self, parent_chunks: List[ParentChunk], child_chunks: List[ChildChunk]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Insert Parents
            for p in parent_chunks:
                cursor.execute("""
                    INSERT OR REPLACE INTO parent_chunks 
                    (parent_id, document_id, title, heading_path, content, page_start, page_end, token_count, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    p.parent_id,
                    p.document_id,
                    p.title,
                    p.heading_path,
                    p.content,
                    p.page_start,
                    p.page_end,
                    p.token_count,
                    json.dumps(p.metadata),
                ))

            # Insert Children
            for c in child_chunks:
                cursor.execute("""
                    INSERT OR REPLACE INTO child_chunks
                    (chunk_id, parent_id, document_id, text, heading_path, page_start, page_end, token_count, source_type, book_reference, chapter, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    c.chunk_id,
                    c.parent_id,
                    c.document_id,
                    c.text,
                    c.heading_path,
                    c.page_start,
                    c.page_end,
                    c.token_count,
                    c.source_type,
                    c.book_reference,
                    c.chapter,
                    json.dumps(c.metadata),
                ))

            conn.commit()
            logger.info(f"Persisted {len(parent_chunks)} parents and {len(child_chunks)} children to {self.db_path}")

    def get_parent(self, parent_id: str) -> Optional[ParentChunk]:
        """
        Fetches full parent section context during retrieval parent expansion.
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT parent_id, document_id, title, heading_path, content, page_start, page_end, token_count, metadata_json FROM parent_chunks WHERE parent_id = ?;", (parent_id,))
            row = cursor.fetchone()
            if row:
                return ParentChunk(
                    parent_id=row[0],
                    document_id=row[1],
                    title=row[2],
                    heading_path=row[3],
                    content=row[4],
                    page_start=row[5],
                    page_end=row[6],
                    token_count=row[7],
                    metadata=json.loads(row[8]) if row[8] else {}
                )
        return None

    def get_child(self, chunk_id: str) -> Optional[ChildChunk]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT chunk_id, parent_id, document_id, text, heading_path, page_start, page_end, token_count, source_type, book_reference, chapter, metadata_json FROM child_chunks WHERE chunk_id = ?;", (chunk_id,))
            row = cursor.fetchone()
            if row:
                return ChildChunk(
                    chunk_id=row[0],
                    parent_id=row[1],
                    document_id=row[2],
                    text=row[3],
                    heading_path=row[4],
                    page_start=row[5],
                    page_end=row[6],
                    token_count=row[7],
                    source_type=row[8],
                    book_reference=row[9],
                    chapter=row[10],
                    metadata=json.loads(row[11]) if row[11] else {}
                )
        return None

    def get_children_for_document(self, document_id: str) -> List[ChildChunk]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT chunk_id, parent_id, document_id, text, heading_path, page_start, page_end, token_count, source_type, book_reference, chapter, metadata_json FROM child_chunks WHERE document_id = ?;", (document_id,))
            rows = cursor.fetchall()
            return [
                ChildChunk(
                    chunk_id=r[0],
                    parent_id=r[1],
                    document_id=r[2],
                    text=r[3],
                    heading_path=r[4],
                    page_start=r[5],
                    page_end=r[6],
                    token_count=r[7],
                    source_type=r[8],
                    book_reference=r[9],
                    chapter=r[10],
                    metadata=json.loads(r[11]) if r[11] else {}
                )
                for r in rows
            ]

    def get_all_children(self) -> List[ChildChunk]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT chunk_id, parent_id, document_id, text, heading_path, page_start, page_end, token_count, source_type, book_reference, chapter, metadata_json FROM child_chunks;")
            rows = cursor.fetchall()
            return [
                ChildChunk(
                    chunk_id=r[0],
                    parent_id=r[1],
                    document_id=r[2],
                    text=r[3],
                    heading_path=r[4],
                    page_start=r[5],
                    page_end=r[6],
                    token_count=r[7],
                    source_type=r[8],
                    book_reference=r[9],
                    chapter=r[10],
                    metadata=json.loads(r[11]) if r[11] else {}
                )
                for r in rows
            ]

    def delete_document_chunks(self, document_id: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM child_chunks WHERE document_id = ?;", (document_id,))
            cursor.execute("DELETE FROM parent_chunks WHERE document_id = ?;", (document_id,))
            conn.commit()
            logger.info(f"Deleted chunks for document {document_id}")


chunk_store = ChunkStore()
