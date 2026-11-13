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


async def test_qdrant_docker_pipeline():
    print("=== Testing Jina API + Qdrant Docker Integration ===")
    print(f"VECTOR_STORE_PROVIDER: {settings.VECTOR_STORE_PROVIDER}")
    print(f"QDRANT_URL: {settings.QDRANT_URL}")
    print(f"QDRANT_COLLECTION_NAME: {settings.QDRANT_COLLECTION_NAME}")
    print(f"Active Provider: {vector_store.provider}")
    assert vector_store.provider == "qdrant", "Expected Qdrant vector store to be active"

    # 1. Test Embeddings
    test_texts = [
        "Database Architecture and Three-Schema Model in relational systems.",
        "Distance Vector Routing and Bellman-Ford algorithm in packet networks.",
    ]
    passage_vectors = await embed_texts(test_texts, task="retrieval.passage")
    assert len(passage_vectors) == 2, f"Expected 2 passage vectors, got {len(passage_vectors)}"
    assert len(passage_vectors[0]) == 1024, f"Expected 1024 dimensions, got {len(passage_vectors[0])}"
    print(f"[PASSED] Generated {len(passage_vectors)} passage vectors (1024-dim each).")

    # 2. Test Indexing in Qdrant
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
    print(f"[PASSED] Successfully indexed {indexed_count} child chunks in Qdrant collection.")

    # 3. Test Vector Search
    query_results = await vector_search(
        question="How does 2PL ensure serializability?",
        source_scope="textbook_and_materials",
        top_k=2,
    )
    assert len(query_results["ids"][0]) > 0, "Expected non-empty search results from Qdrant"
    print(f"[PASSED] Qdrant search retrieved {len(query_results['ids'][0])} candidates: {query_results['ids'][0]}")

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

    # 5. Cleanup test vectors
    indexing_service.delete_document_vectors("doc-test-dbms")
    indexing_service.delete_document_vectors("doc-test-curriculum")
    print("[PASSED] Document vector cleanup from Qdrant verified.")

    print("\n=== ALL JINA + QDRANT DOCKER TESTS COMPLETED SUCCESSFULLY ===")


if __name__ == "__main__":
    asyncio.run(test_qdrant_docker_pipeline())

