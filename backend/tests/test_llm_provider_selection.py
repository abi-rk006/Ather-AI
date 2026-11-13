import pytest
import os
import sys
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)


def test_test_llm_endpoint_unreachable():
    """Tests that verification of an offline or invalid endpoint returns a clean structured response instead of 500 error."""
    payload = {
        "provider": "lmstudio",
        "baseUrl": "http://127.0.0.1:54321/v1",  # Unused port
        "apiKey": "",
        "model": "local-model",
    }
    response = client.post("/api/settings/test-llm", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Connection refused" in data["message"] or "failed" in data["message"]


def test_chat_with_custom_llm_parameters():
    """Tests that /api/chat accepts custom LLM provider & endpoint parameters and gracefully falls back to grounded syllabus output if offline."""
    payload = {
        "prompt": "What is two-phase locking protocol?",
        "answeringMode": "exam",
        "examMarksFormat": "2-mark",
        "searchScope": "textbook_and_materials",
        "llmProvider": "lmstudio",
        "llmEndpoint": "http://localhost:1234/v1",
        "llmApiKey": "",
        "llmModel": "local-model",
        "temperature": 0.2,
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0
    assert "telemetry" in data
    assert "citations" in data


def test_retrieval_mode_never_invokes_synthetic_llm():
    """Retrieval Mode must remain 100% verbatim textbook evidence without synthetic LLM generation."""
    payload = {
        "prompt": "Explain database architecture",
        "answeringMode": "retrieval",
        "searchScope": "textbook_and_materials",
        "llmProvider": "groq",
        "llmEndpoint": "https://api.groq.com/openai/v1",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Retrieval Mode" in data["response"]

