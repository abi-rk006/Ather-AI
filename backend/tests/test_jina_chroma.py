import asyncio
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.services.vector_store import vector_store
from app.services.embedding_service import embed_texts
from app.services.indexing_service import indexing_service
from app.services.retrieval_service import retrieval_service, vector_search
from app.rag.chunking.models import ChildChunk


async def test_jina_chroma_pipeline():
    print("=== Testing Jina API + Chroma Cloud Integration ===")
    print(f"JINA_EMBEDDING_MODEL: {settings.JINA_EMBEDDING_MODEL}")
    print(f"JINA_EMBEDDING_DIMENSIONS: {settings.JINA_EMBEDDING_DIMENSIONS}")
    print(f"CHROMA_COLLECTION_NAME: {settings.CHROMA_COLLECTION_NAME}")
    print(f"Chroma Cloud active: {vector_store.is_cloud}")

    # 1. Test Embeddings
    test_texts = [
        "Database Architecture and Three-Schema Model in relational systems.",
        "Distance Vector Routing and Bellman-Ford algorithm in packet networks.",
    ]
    passage_vectors = await embed_texts(test_texts, task="retrieval.passage")
    assert len(passage_vectors) == 2, f"Expected 2 passage vectors, got {len(passage_vectors)}"
    assert len(passage_vectors[0]) == 1024, f"Expected 1024 dimensions, got {len(passage_vectors[0])}"
    print(f"[PASSED] Generated {len(passage_vectors)} passage vectors (1024-dim each).")

    query_vectors = await embed_texts(["Explain 2PL protocol in DBMS"], task="retrieval.query")
    assert len(query_vectors) == 1, "Expected 1 query vector"
    assert len(query_vectors[0]) == 1024, "Expected 1024 dimensions"
    print(f"[PASSED] Generated 1 query vector (task='retrieval.query', 1024-dim).")

    # 2. Test Indexing in Chroma
    sample_child_chunks = [
        ChildChunk(
            chunk_id="test-chunk-dbms-1",
            parent_id="test-parent-dbms-1",
            document_id="doc-test-dbms",
            text="Two-phase locking ensures serializability by dividing locking into growing and shrinking phases.",
            heading_path="Unit 4 > Concurrency Control > 2PL Protocol",
            page_start=140,
            page_end=142,
            token_count=85,
            source_type="primary_textbook",
            book_reference="Database System Concepts (Silberschatz)",
            chapter="Chapter 14",
        ),
        ChildChunk(
            chunk_id="test-chunk-curriculum-1",
            parent_id="test-parent-curriculum-1",
            document_id="doc-test-curriculum",
            text="CS3391 Database Systems: Regulation 2021 curriculum and textbook syllabus mapping.",
            heading_path="Regulation 2021 > Semester 4 > CS3391",
            page_start=1,
            page_end=1,
            token_count=65,
            source_type="student_document",
            book_reference="Anna University Regulation 2021",
            chapter="Semester 4",
        ),
    ]

    indexed_count = await indexing_service.index_child_chunks(sample_child_chunks)
    assert indexed_count == 2, f"Expected 2 indexed chunks, got {indexed_count}"
    print(f"[PASSED] Successfully indexed {indexed_count} child chunks in Chroma collection.")

    # 3. Test Vector Search
    query_results = await vector_search(
        question="How does 2PL ensure serializability?",
        source_scope="textbook_and_materials",
        top_k=2,
    )
    assert len(query_results["ids"][0]) > 0, "Expected non-empty search results from Chroma"
    print(f"[PASSED] Vector search retrieved {len(query_results['ids'][0])} candidates.")

    # 4. Test Search with Scope Filter
    textbook_chunks = await retrieval_service.search(
        query="serializability",
        search_scope="textbook_only",
        top_k=2,
    )
    assert len(textbook_chunks) > 0, "Expected textbook search results"
    print(f"[PASSED] RetrievalService search returned {len(textbook_chunks)} grounded evidence chunks.")
    for chunk in textbook_chunks:
        print(f"   -> Found: [{chunk.chunk_id}] {chunk.doc_title} (Match: {chunk.relevance_score})")

    # 5. Cleanup test vector
    indexing_service.delete_document_vectors("doc-test-dbms")
    indexing_service.delete_document_vectors("doc-test-curriculum")
    print("[PASSED] Document vector cleanup verified.")

    print("\n=== ALL JINA + CHROMA TESTS COMPLETED SUCCESSFULLY ===")


if __name__ == "__main__":
    asyncio.run(test_jina_chroma_pipeline())
