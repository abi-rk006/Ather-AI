import asyncio
import os
import sys
import pytest

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.reranker_service import RerankerService, reranker_service
from app.services.retrieval_service import retrieval_service
from app.models.retrieval import RetrievalSearchRequest


def test_local_cross_encoder_reranking():
    """Tests the local cross-attention heuristic scoring when Jina is offline or disabled."""
    service = RerankerService()
    query = "Two-Phase Locking protocol in DBMS concurrency control"

    candidates = [
        {
            "chunk_id": "c-net-01",
            "text": "TCP sliding window flow control maintains sender and receiver buffer synchrony.",
            "metadata": {"heading_path": "Computer Networks > Transport Layer"},
            "rrf_score": 0.030,
        },
        {
            "chunk_id": "c-dbms-01",
            "text": "Two-Phase Locking protocol (2PL) guarantees conflict serializability in DBMS concurrency control through a growing phase and shrinking phase.",
            "metadata": {"heading_path": "DBMS > Concurrency Control > Two-Phase Locking"},
            "rrf_score": 0.025,
        },
        {
            "chunk_id": "c-os-01",
            "text": "Process scheduling algorithms like Round Robin allocate CPU time slices to active processes.",
            "metadata": {"heading_path": "Operating Systems > CPU Scheduling"},
            "rrf_score": 0.028,
        },
    ]

    reranked = service._local_cross_encoder_rerank(query, candidates, top_n=3)

    assert len(reranked) == 3
    # Candidate B must be boosted to the top rank due to exact query phrases, keywords, and heading alignment
    assert reranked[0]["chunk_id"] == "c-dbms-01"
    assert reranked[0]["relevance_score"] > reranked[1]["relevance_score"]
    assert reranked[0]["relevance_score"] > reranked[2]["relevance_score"]
    assert reranked[0]["rerank_model"] == "local-heuristic-cross-scorer"


def test_jina_cross_encoder_rerank_live_or_fallback():
    """Tests Jina Neural Reranker v2 with fallback resilience."""
    async def _run():
        query = "Explain 2PL protocol in DBMS"

        candidates = [
            {
                "chunk_id": "c-net",
                "text": "OSPF is an interior gateway routing protocol using Dijkstra shortest path algorithm.",
                "metadata": {"heading_path": "Routing Protocols"},
                "rrf_score": 0.020,
            },
            {
                "chunk_id": "c-dbms",
                "text": "The Two-Phase Locking (2PL) protocol ensures serializability by restricting transactions to acquiring locks during the growing phase and releasing them during the shrinking phase.",
                "metadata": {"heading_path": "DBMS > Concurrency Control"},
                "rrf_score": 0.019,
            },
        ]

        # Test dispatch
        results = await reranker_service.rerank(query, candidates, top_n=2)
        assert len(results) == 2
        # The DBMS passage should be ranked first by either Jina or fallback
        assert results[0]["chunk_id"] == "c-dbms"
        assert "relevance_score" in results[0]
        assert results[0]["relevance_score"] > 0.0
        assert results[0]["rerank_model"] in [
            "jina-reranker-v2-base-multilingual",
            "local-heuristic-cross-scorer",
        ]

    asyncio.run(_run())


def test_retrieval_mode_incorporates_reranker():
    """Tests that search_retrieval_mode passes candidates through the reranker and attaches scores."""
    async def _run():
        req = RetrievalSearchRequest(
            query="concurrency control and serializability",
            subject_id="general",
            source_scope="textbook_and_materials",
            page=1,
            page_size=5,
            top_k=10,
        )

        response = await retrieval_service.search_retrieval_mode(req)
        assert response is not None
        assert response.query == req.query
        assert isinstance(response.results, list)

        # If results are returned, ensure relevance_score and rerank_model fields exist on items
        for item in response.results:
            assert hasattr(item, "rrf_score")
            assert hasattr(item, "relevance_score")
            assert hasattr(item, "rerank_model")

    asyncio.run(_run())


def test_search_for_exam_mode_with_reranker():
    """Tests that retrieval_service.search returns DocumentChunks with populated relevance_scores."""
    async def _run():
        chunks = await retrieval_service.search(
            query="locking protocols in database transactions",
            top_k=3,
        )
        assert isinstance(chunks, list)
        for c in chunks:
            assert c.chunk_id is not None
            assert c.relevance_score is not None
            assert 0.0 <= c.relevance_score <= 1.0

    asyncio.run(_run())


if __name__ == "__main__":
    test_local_cross_encoder_reranking()
    test_jina_cross_encoder_rerank_live_or_fallback()
    test_retrieval_mode_incorporates_reranker()
    test_search_for_exam_mode_with_reranker()
    print("All reranker tests passed successfully!")
