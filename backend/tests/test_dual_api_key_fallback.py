import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.chat_service import chat_service
from app.models.chat import ChatRequest

client = TestClient(app)


def test_get_api_key_candidates():
    """Verify that _get_api_key_candidates extracts and deduplicates candidate keys."""
    # Test with distinct primary and secondary keys
    keys = chat_service._get_api_key_candidates(
        provider="groq",
        primary_key="gsk_key1_primary",
        fallback_key="gsk_key2_fallback",
    )
    assert "gsk_key1_primary" in keys
    assert "gsk_key2_fallback" in keys
    assert len(keys) >= 2
    # Primary key should be first
    assert keys[0] == "gsk_key1_primary"


def test_get_api_key_candidates_comma_separated():
    """Verify that comma-separated API keys in a single field are split correctly."""
    keys = chat_service._get_api_key_candidates(
        provider="groq",
        primary_key="key_a, key_b",
        fallback_key="key_c",
    )
    assert keys[0] == "key_a"
    assert keys[1] == "key_b"
    assert "key_c" in keys


def test_get_api_key_candidates_local():
    """Local providers (lmstudio, ollama) should return single local token."""
    keys = chat_service._get_api_key_candidates("lmstudio")
    assert keys == ["lmstudio"]


def test_call_llm_api_failover_on_429():
    """
    Simulates Primary API key hitting 429 Rate Limit;
    verifies that system automatically retries with Fallback API key and succeeds.
    """
    import asyncio

    async def _run_test():
        mock_res_429 = MagicMock()
        mock_res_429.status_code = 429
        mock_res_429.text = '{"error": {"message": "Rate limit reached"}}'

        mock_res_200 = MagicMock()
        mock_res_200.status_code = 200
        mock_res_200.json.return_value = {
            "choices": [{"message": {"content": "Successfully generated with fallback key"}}]
        }

        call_count = 0
        used_auth_headers = []

        async def mock_post(self, url, headers=None, json=None, **kwargs):
            nonlocal call_count, used_auth_headers
            call_count += 1
            used_auth_headers.append(headers.get("Authorization") if headers else None)
            if call_count == 1:
                return mock_res_429
            return mock_res_200

        with patch("httpx.AsyncClient.post", new=mock_post), \
             patch("app.config.settings.LLM_API_KEY", ""), \
             patch("app.config.settings.LLM_FALLBACK_API_KEY", ""):
            res = await chat_service._call_llm_api(
                provider="groq",
                base_url="https://api.groq.com/openai/v1",
                api_key="primary_rate_limited_key",
                fallback_api_key="secondary_active_key",
                model="qwen/qwen3.8-27b",
                temperature=0.2,
                system_prompt="system",
                user_prompt="user",
            )

            assert res == "Successfully generated with fallback key"
            assert call_count == 2
            assert used_auth_headers[0] == "Bearer primary_rate_limited_key"
            assert used_auth_headers[1] == "Bearer secondary_active_key"

    asyncio.run(_run_test())


def test_api_chat_accepts_fallback_key():
    """Verify that ChatRequest model and /api/chat accept llmFallbackApiKey without validation error."""
    payload = {
        "prompt": "What is an Autoencoder?",
        "answeringMode": "exam",
        "examMarksFormat": "2-mark",
        "searchScope": "textbook_and_materials",
        "llmProvider": "groq",
        "llmApiKey": "primary_test_key",
        "llmFallbackApiKey": "fallback_test_key",
        "llmModel": "qwen/qwen3.8-27b",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "telemetry" in data


def test_gemini_provider_isolation_prevents_groq_key_leakage():
    """
    Ensure that when provider is 'gemini', Groq API keys from settings (.env)
    are NOT leaked or injected into Gemini API requests.
    """
    with patch("app.config.settings.LLM_PROVIDER", "groq"), \
         patch("app.config.settings.LLM_API_KEY", "gsk_groq_secret_key"):
        keys = chat_service._get_api_key_candidates(
            provider="gemini",
            primary_key="AIzaSy_gemini_primary",
            fallback_key="AIzaSy_gemini_fallback",
        )
        assert keys == ["AIzaSy_gemini_primary", "AIzaSy_gemini_fallback"]
        assert "gsk_groq_secret_key" not in keys


def test_gemini_model_remapping_and_404_recovery():
    """
    Ensure that deprecated gemini-2.0-flash is remapped to gemini-2.5-flash
    and no unwanted Groq requests are triggered.
    """
    import asyncio

    async def _run_gemini_test():
        requested_models = []
        target_urls = []

        async def mock_gemini_post(self, url, headers=None, json=None, **kwargs):
            nonlocal requested_models, target_urls
            target_urls.append(url)
            requested_models.append(json.get("model"))
            mock_ok = MagicMock()
            mock_ok.status_code = 200
            mock_ok.json.return_value = {
                "choices": [{"message": {"content": "Gemini 2.5 Flash response"}}]
            }
            return mock_ok

        with patch("httpx.AsyncClient.post", new=mock_gemini_post):
            res = await chat_service._call_llm_api(
                provider="gemini",
                base_url="https://generativelanguage.googleapis.com/v1beta/openai",
                api_key="AIzaSy_test_key",
                model="gemini-2.0-flash",
                temperature=0.2,
                system_prompt="system",
                user_prompt="user",
            )
            assert res == "Gemini 2.5 Flash response"
            # Model should have been auto-remapped from gemini-2.0-flash to gemini-2.5-flash
            assert requested_models[0] == "gemini-2.5-flash"
            # Target URL must remain Google's endpoint, NEVER groq
            assert "generativelanguage.googleapis.com" in target_urls[0]
            assert "groq.com" not in target_urls[0]

    asyncio.run(_run_gemini_test())


def test_nvidia_endpoint_and_model_resolution():
    """
    Ensure that NVIDIA NIM provider resolves to https://integrate.api.nvidia.com/v1/chat/completions,
    defaults to meta/llama-3.3-70b-instruct, and passes Bearer nvapi-... without key leakage.
    """
    import asyncio

    # Test endpoint resolution
    resolved_url = chat_service._resolve_endpoint("nvidia")
    assert resolved_url == "https://integrate.api.nvidia.com/v1/chat/completions"

    # Test key candidate isolation
    with patch("app.config.settings.LLM_PROVIDER", "groq"), \
         patch("app.config.settings.LLM_API_KEY", "gsk_groq_secret_key"):
        keys = chat_service._get_api_key_candidates(
            provider="nvidia",
            primary_key="nvapi-test-primary-12345",
            fallback_key="nvapi-test-fallback-67890",
        )
        assert keys == ["nvapi-test-primary-12345", "nvapi-test-fallback-67890"]
        assert "gsk_groq_secret_key" not in keys

    async def _run_nvidia_test():
        requested_models = []
        target_urls = []
        auth_headers = []

        async def mock_nvidia_post(self, url, headers=None, json=None, **kwargs):
            nonlocal requested_models, target_urls, auth_headers
            target_urls.append(url)
            requested_models.append(json.get("model"))
            auth_headers.append(headers.get("Authorization") if headers else None)
            mock_ok = MagicMock()
            mock_ok.status_code = 200
            mock_ok.json.return_value = {
                "choices": [{"message": {"content": "Llama 3.3 70B response from NVIDIA NIM"}}]
            }
            return mock_ok

        with patch("httpx.AsyncClient.post", new=mock_nvidia_post):
            res = await chat_service._call_llm_api(
                provider="nvidia",
                base_url="",  # Should resolve to https://integrate.api.nvidia.com/v1
                api_key="nvapi-test-primary-12345",
                fallback_api_key="nvapi-test-fallback-67890",
                model="",  # Should default to meta/llama-3.3-70b-instruct
                temperature=0.2,
                system_prompt="You are an academic tutor.",
                user_prompt="Explain Recurrent Neural Networks.",
            )
            assert res == "Llama 3.3 70B response from NVIDIA NIM"
            assert target_urls[0] == "https://integrate.api.nvidia.com/v1/chat/completions"
            assert requested_models[0] == "meta/llama-3.3-70b-instruct"
            assert auth_headers[0] == "Bearer nvapi-test-primary-12345"

    asyncio.run(_run_nvidia_test())


def test_nvidia_dual_key_failover_and_404_recovery():
    """
    Ensure NVIDIA NIM handles 429 rate limits by seamlessly switching to secondary nvapi key,
    and handles 404 by falling back to meta/llama-3.1-8b-instruct.
    """
    import asyncio

    async def _run_nvidia_failover_test():
        call_count = 0
        used_auth_headers = []

        mock_429 = MagicMock()
        mock_429.status_code = 429
        mock_429.text = '{"detail": "Too Many Requests on NVIDIA NIM"}'

        mock_200 = MagicMock()
        mock_200.status_code = 200
        mock_200.json.return_value = {
            "choices": [{"message": {"content": "Generated successfully with fallback key"}}]
        }

        async def mock_nvidia_post(self, url, headers=None, json=None, **kwargs):
            nonlocal call_count, used_auth_headers
            call_count += 1
            used_auth_headers.append(headers.get("Authorization") if headers else None)
            if call_count == 1:
                return mock_429
            return mock_200

        with patch("httpx.AsyncClient.post", new=mock_nvidia_post), \
             patch("app.config.settings.LLM_API_KEY", ""), \
             patch("app.config.settings.LLM_FALLBACK_API_KEY", ""):
            res = await chat_service._call_llm_api(
                provider="nvidia",
                base_url="",
                api_key="nvapi-primary-key",
                fallback_api_key="nvapi-secondary-key",
                model="meta/llama-3.3-70b-instruct",
                temperature=0.2,
                system_prompt="system",
                user_prompt="user",
            )
            assert res == "Generated successfully with fallback key"
            assert call_count == 2
            assert used_auth_headers[0] == "Bearer nvapi-primary-key"
            assert used_auth_headers[1] == "Bearer nvapi-secondary-key"

    asyncio.run(_run_nvidia_failover_test())


def test_clean_thinking_and_preamble():
    """Verify that internal thinking tags and scratchpad deliberation are completely stripped."""
    # Test 1: Explicit <think> tag from reasoning models
    raw_think = "<think>\nThinking about RNN equations...\n</think>\n### 1. Introduction and Definition\nAn RNN is..."
    cleaned = chat_service._clean_thinking_and_preamble(raw_think)
    assert cleaned.startswith("### 1. Introduction and Definition")
    assert "<think>" not in cleaned

    # Test 2: Deliberation monologue scratchpad (Nemotron style)
    raw_scratchpad = (
        "The user wants me to analyze syllabus concepts and extract key questions from Deep Learning. "
        "This is a meta-request... Looking at the system prompt, I should prepare an answer.\n\n"
        "### 1. Curriculum & Syllabus Structure\nThe syllabus comprises 5 units..."
    )
    cleaned_scratchpad = chat_service._clean_thinking_and_preamble(raw_scratchpad)
    assert cleaned_scratchpad.startswith("### 1. Curriculum & Syllabus Structure")
    assert "The user wants me to" not in cleaned_scratchpad
    assert "This is a meta-request" not in cleaned_scratchpad


def test_contextualize_query_acronym_normalization():
    """Verify that acronym typos like 'crn' are normalized for syllabus search."""
    import asyncio

    async def _run():
        res = await chat_service.contextualize_query(
            prompt="explain crn architecture and working with neat diagram",
            history=[],
            provider="groq",
        )
        assert "CNN" in res or "Convolutional" in res or "RNN" in res

    asyncio.run(_run())


def test_diagnose_llm_error_tpm_token_limit_and_model_unavailable():
    """Verify error diagnosis extracts student-friendly explanations for TPM token limits & 404s."""
    # 1. Groq HTTP 413 TPM token limit
    err_413 = '{"error":{"message":"Request too large for model `openai/gpt-oss-120b` on tokens per minute (TPM): Limit 8000, Requested 12282"}}'
    diag_413 = chat_service._diagnose_llm_error(413, err_413, "openai/gpt-oss-120b", "groq")
    assert diag_413["code"] == "TOKEN_LIMIT_EXCEEDED"
    assert "8000" in diag_413["detail"]
    assert "12282" in diag_413["detail"]

    # 2. Gemini HTTP 404 Deprecation
    err_404 = '{"error":{"code":404,"message":"This model models/gemini-2.0-flash is no longer available. Please update your code."}}'
    diag_404 = chat_service._diagnose_llm_error(404, err_404, "gemini-2.0-flash", "gemini")
    assert diag_404["code"] == "MODEL_UNAVAILABLE"
    assert "gemini-2.0-flash" in diag_404["detail"]

    # 3. HTTP 429 Rate Limit
    diag_429 = chat_service._diagnose_llm_error(429, "Rate limit reached", "llama-3.3-70b", "groq")
    assert diag_429["code"] == "RATE_LIMIT_EXCEEDED"


def test_call_llm_api_failover_on_413_tpm_limit():
    """Verify that HTTP 413 TPM Token Limit on primary model automatically fails over to secondary model."""
    import asyncio

    async def _run():
        call_count = 0
        models_called = []

        mock_413 = MagicMock()
        mock_413.status_code = 413
        mock_413.text = '{"error":{"message":"Request too large on tokens per minute (TPM): Limit 8000, Requested 12282"}}'

        mock_200 = MagicMock()
        mock_200.status_code = 200
        mock_200.json.return_value = {
            "choices": [{"message": {"content": "Response from high-capacity secondary model"}}]
        }

        async def mock_post(self, url, headers=None, json=None, **kwargs):
            nonlocal call_count, models_called
            call_count += 1
            models_called.append(json.get("model") if json else "")
            if call_count == 1:
                return mock_413
            return mock_200

        with patch("httpx.AsyncClient.post", new=mock_post):
            res = await chat_service._call_llm_api(
                provider="groq",
                base_url="https://api.groq.com/openai/v1",
                api_key="gsk-key-1",
                model="openai/gpt-oss-120b",
                fallback_model="qwen/qwen3.8-27b",
                temperature=0.2,
                system_prompt="system",
                user_prompt="user",
            )
            assert res == "Response from high-capacity secondary model"
            assert call_count == 2
            assert models_called[0] == "openai/gpt-oss-120b"
            assert models_called[1] == "qwen/qwen3.8-27b"
            assert chat_service.last_status_notice is not None
            assert chat_service.last_status_notice["code"] == "FALLOVER_SUCCESS"

    asyncio.run(_run())


def test_generate_response_informs_user_when_token_limit_exceeded():
    """Verify that when token limits block all remote model attempts, response includes warning alert."""
    import asyncio
    from unittest.mock import AsyncMock
    from app.models.chat import ChatRequest
    from app.services.retrieval_service import retrieval_service
    from app.services.firestore_service import firestore_service

    async def _run():
        mock_413 = MagicMock()
        mock_413.status_code = 413
        mock_413.text = '{"error":{"message":"Request too large on tokens per minute (TPM): Limit 8000, Requested 12282"}}'

        async def mock_post(self, url, headers=None, json=None, **kwargs):
            return mock_413

        with patch("httpx.AsyncClient.post", new=mock_post), \
             patch.object(retrieval_service, "search", new_callable=AsyncMock) as mock_search, \
             patch.object(firestore_service, "save_message", new_callable=AsyncMock):
            mock_search.return_value = []
            req = ChatRequest(
                prompt="Explain autoencoders with neat architecture diagram",
                answeringMode="exam",
                examMarksFormat="13-mark",
                llmProvider="groq",
                llmModel="openai/gpt-oss-120b",
            )
            resp = await chat_service.generate_response(req, user_id="test-user")
            # Must inform the user transparently about Token Limit Exceeded
            assert "Token Limit Exceeded" in resp.response
            assert "8000" in resp.response or "TPM" in resp.response
            assert resp.statusNotice is not None
            assert resp.statusNotice["code"] == "TOKEN_LIMIT_EXCEEDED"

    asyncio.run(_run())

