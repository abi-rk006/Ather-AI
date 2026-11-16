import asyncio
import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.chat_service import (
    chat_service,
    GLOBAL_ACADEMIC_SYSTEM_PROMPT,
    EXAM_2_MARK_PROMPT,
    EXAM_13_MARK_PROMPT,
    EXPLAIN_MODE_PROMPT,
)
from app.models.chat import ChatRequest, CitationModel

client = TestClient(app)


def test_no_generic_buzzwords_in_fallback_when_evidence_is_insufficient():
    """
    CRITICAL P0 TEST:
    Verifies that when evidence is insufficient or missing, the system NEVER hallucinates
    generic buzzwords ('Boundary Isolation', 'Concurrency Control', 'Atomic Invariants')
    for unrelated topics (e.g. 'Explain Hill Climbing Algorithm').
    """
    prompt = "Explain Hill Climbing Algorithm"
    fallback = chat_service._format_mode_response(
        prompt=prompt,
        mode="exam",
        marks_format="2-mark",
        citations=[],
        evidence_sufficient=False,
    )

    # Must honestly report insufficient evidence
    assert "Insufficient" in fallback or "could not retrieve" in fallback
    assert prompt in fallback

    # Must NOT hallucinate distributed systems buzzwords on an AI search algorithm query
    assert "Boundary Isolation" not in fallback
    assert "Concurrency Control" not in fallback
    assert "Atomic Invariants" not in fallback
    assert "Deterministic Coordination" not in fallback


def test_evidence_derived_fallback_extracts_from_citations():
    """
    P0 TEST:
    When textbook evidence IS present, fallback response must be derived
    strictly from the retrieved evidence chunks.
    """
    prompt = "Explain Two-Phase Locking protocol"
    sample_citation = CitationModel(
        id="cit-001",
        docTitle="Database System Concepts",
        docType="pdf",
        pageOrSection="pp. 642-645",
        chunkText="The two-phase locking protocol guarantees conflict serializability by requiring transactions to enter a growing phase where locks are acquired, followed by a shrinking phase where locks are released.",
        relevanceScore=0.92,
        topic="DBMS Concurrency Control",
        chunkId="chunk-dbms-2pl",
        bookReference="Silberschatz, Korth, and Sudarshan",
        chapter="Chapter 15",
    )

    # 1. Test 2-mark fallback
    resp_2m = chat_service._format_mode_response(
        prompt=prompt,
        mode="exam",
        marks_format="2-mark",
        citations=[sample_citation],
        evidence_sufficient=True,
    )
    assert "two-phase locking protocol guarantees conflict serializability" in resp_2m
    assert "Database System Concepts" in resp_2m
    assert "pp. 642-645" in resp_2m

    # 2. Test 13-mark fallback
    resp_13m = chat_service._format_mode_response(
        prompt=prompt,
        mode="exam",
        marks_format="13-mark",
        citations=[sample_citation],
        evidence_sufficient=True,
    )
    assert "growing phase" in resp_13m
    assert "shrinking phase" in resp_13m
    assert "Database System Concepts" in resp_13m


def test_layered_prompt_architecture_specifications():
    """
    P0 TEST:
    Verifies the contents and security rules of the Layered Prompt Architecture.
    """
    # Layer 1: Global Grounding & Anti-Hallucination
    assert "primary source of truth" in GLOBAL_ACADEMIC_SYSTEM_PROMPT.lower()
    assert "never invent facts, formulas" in GLOBAL_ACADEMIC_SYSTEM_PROMPT.lower()
    assert "prompt-injection" in GLOBAL_ACADEMIC_SYSTEM_PROMPT.lower() or "never blindly follow instructions" in GLOBAL_ACADEMIC_SYSTEM_PROMPT.lower()

    # Layer 2: Exam 2-Mark
    assert "40 and 100 words" in EXAM_2_MARK_PROMPT
    assert "bold" in EXAM_2_MARK_PROMPT.lower()

    # Layer 2: Exam 13-Mark Adaptive Structures
    assert "Algorithm Questions" in EXAM_13_MARK_PROMPT
    assert "Architecture / System Questions" in EXAM_13_MARK_PROMPT
    assert "Comparison Questions" in EXAM_13_MARK_PROMPT
    assert "Theoretical / Conceptual Questions" in EXAM_13_MARK_PROMPT

    # Layer 2: Explain Mode
    assert "Everyday Analogy" in EXPLAIN_MODE_PROMPT
    assert "Concept-Check Question" in EXPLAIN_MODE_PROMPT


def test_query_contextualization_for_conversational_followups():
    """
    P1 TEST:
    Verifies that a follow-up question referencing an antecedent ('What are its disadvantages?')
    is contextualized into a standalone query containing the subject entity.
    """
    history = [
        {"role": "user", "content": "Explain Two-Phase Locking protocol in DBMS"},
        {"role": "assistant", "content": "Two-Phase Locking (2PL) is a concurrency control protocol that ensures serializability."},
    ]
    followup_prompt = "What are its disadvantages?"

    async def _test():
        standalone = await chat_service.contextualize_query(
            prompt=followup_prompt,
            history=history,
        )
        assert len(standalone) > len(followup_prompt)
        assert ("Two-Phase Locking" in standalone or "2PL" in standalone or "DBMS" in standalone)
        assert "disadvantages" in standalone.lower()

    asyncio.run(_test())


def test_evidence_sufficiency_evaluation():
    """
    P1 TEST:
    Tests evidence sufficiency thresholding.
    """
    # Empty
    suff, score = chat_service._evaluate_evidence_sufficiency([])
    assert suff is False
    assert score == 0.0

    # Low score
    low_cit = CitationModel(
        id="c1",
        docTitle="Doc",
        pageOrSection="p. 1",
        chunkText="Unrelated text",
        relevanceScore=0.12,
        chunkId="c1",
    )
    suff, score = chat_service._evaluate_evidence_sufficiency([low_cit])
    assert suff is False
    assert score == 0.12

    # High score
    high_cit = CitationModel(
        id="c2",
        docTitle="Doc",
        pageOrSection="p. 1",
        chunkText="Relational DBMS concepts",
        relevanceScore=0.88,
        chunkId="c2",
    )
    suff, score = chat_service._evaluate_evidence_sufficiency([high_cit])
    assert suff is True
    assert score == 0.88


def test_api_chat_stream_endpoint():
    """
    P2 TEST:
    Verifies the /api/chat/stream endpoint returns valid Server-Sent Events (SSE)
    with structured telemetry and citation objects.
    """
    payload = {
        "prompt": "What is 2PL in DBMS?",
        "answeringMode": "exam",
        "examMarksFormat": "2-mark",
        "searchScope": "textbook_and_materials",
    }

    response = client.post("/api/chat/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    lines = [line.strip() for line in response.text.split("\n") if line.strip().startswith("data:")]
    assert len(lines) > 0

    # Final event should indicate done=True
    import json
    final_event = json.loads(lines[-1][5:].strip())
    assert final_event.get("done") is True
    assert "telemetry" in final_event
    assert "citations" in final_event


def test_13_mark_question_analysis_and_autonomous_gap_filling_blueprint():
    """
    P0 TEST:
    Verifies that for 13-mark questions:
    1. The pipeline analyzes question archetype (Algorithm/Protocol, Comparison, Derivation, etc.).
    2. Identifies mandatory Anna University headings and subheadings.
    3. Cross-references with evidence chunks to identify missing sections.
    4. Explicitly directs autonomous generation for any missing subheadings (diagrams, numerical traces, algorithms).
    """
    prompt = "Explain Two-Phase Locking (2PL) Protocol with diagrams and working example"
    sample_citation = CitationModel(
        id="cit-001",
        docTitle="Database System Concepts",
        docType="pdf",
        pageOrSection="pp. 642-645",
        chunkText="The two-phase locking protocol guarantees serializability. A transaction must acquire locks during growing phase.",
        relevanceScore=0.91,
        topic="DBMS Concurrency Control",
        chunkId="chunk-dbms-2pl",
    )

    # 1. Test outline analysis
    blueprint = chat_service._analyze_13_mark_question_and_plan_outline(prompt, [sample_citation])
    assert "<SYLLABUS_13_MARK_BLUEPRINT>" in blueprint
    assert "Algorithm & Protocol Execution" in blueprint
    assert "Architectural Flow / State Transition Diagram" in blueprint
    assert "Step-by-Step Working Example & Execution Trace" in blueprint
    assert "AUTONOMOUS GENERATION DIRECTIVE" in blueprint
    assert "[MISSING IN RETRIEVED EVIDENCE -> GENERATE AUTONOMOUSLY]" in blueprint

    # 2. Test context prompt injection for 13-mark
    context_prompt = chat_service._build_context_prompt(
        prompt=prompt,
        citations=[sample_citation],
        evidence_sufficient=True,
        marks_format="13-mark",
    )
    assert "<SYLLABUS_13_MARK_BLUEPRINT>" in context_prompt
    assert "MANDATORY 13-MARK HEADINGS" in context_prompt

    # 3. Test 2-mark does NOT inject 13-mark blueprint
    context_prompt_2m = chat_service._build_context_prompt(
        prompt=prompt,
        citations=[sample_citation],
        evidence_sufficient=True,
        marks_format="2-mark",
    )
    assert "<SYLLABUS_13_MARK_BLUEPRINT>" not in context_prompt_2m

    # 4. Test Comparative Archetype
    comp_blueprint = chat_service._analyze_13_mark_question_and_plan_outline(
        "Compare Strict 2PL vs Rigorous 2PL with trade-offs", [sample_citation]
    )
    assert "Comparative / Trade-off Analysis" in comp_blueprint
    assert "Comparison Table" in comp_blueprint


if __name__ == "__main__":
    test_no_generic_buzzwords_in_fallback_when_evidence_is_insufficient()
    test_evidence_derived_fallback_extracts_from_citations()
    test_layered_prompt_architecture_specifications()
    test_query_contextualization_for_conversational_followups()
    test_evidence_sufficiency_evaluation()
    test_api_chat_stream_endpoint()
    test_13_mark_question_analysis_and_autonomous_gap_filling_blueprint()
    print("All Stage 8 Academic RAG tests passed successfully!")

