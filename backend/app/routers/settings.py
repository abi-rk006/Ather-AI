import time
from typing import Optional, List
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Depends

from ..models.settings import UserPreferences, UserPreferencesUpdate
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.firestore_service import firestore_service

router = APIRouter(prefix="/api/settings", tags=["Settings & Preferences"])


class TestLLMRequest(BaseModel):
    provider: str = "groq"
    baseUrl: Optional[str] = None
    apiKey: Optional[str] = None
    model: str = "qwen/qwen3.8-27b"


class TestLLMResponse(BaseModel):
    success: bool
    latencyMs: int
    message: str
    modelsAvailable: Optional[List[str]] = None


@router.get("", response_model=UserPreferences)
async def get_user_settings(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get user preferences from `users/{userId}/settings/preferences`.
    """
    return await firestore_service.get_preferences(user_id=current_user.uid)


@router.patch("", response_model=UserPreferences)
async def update_user_settings(
    update_data: UserPreferencesUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update user preferences in `users/{userId}/settings/preferences`.
    """
    current_prefs = await firestore_service.get_preferences(user_id=current_user.uid)
    updated_dict = current_prefs.model_dump()

    # Merge non-null fields
    update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)
    for k, v in update_dict.items():
        if isinstance(v, dict) and isinstance(updated_dict.get(k), dict):
            updated_dict[k].update(v)
        else:
            updated_dict[k] = v

    new_prefs = UserPreferences(**updated_dict)
    await firestore_service.update_preferences(user_id=current_user.uid, prefs=new_prefs)
    return new_prefs


@router.post("/test-llm", response_model=TestLLMResponse)
async def test_llm_connection(payload: TestLLMRequest):
    """
    Tests connectivity to an LLM provider:
    - Groq Cloud
    - Local LM Studio (http://localhost:1234/v1)
    - Local Ollama (http://localhost:11434/v1)
    - Custom remote HTTP/HTTPS endpoint
    """
    endpoint = (payload.baseUrl or "").strip().rstrip("/")
    if not endpoint:
        if payload.provider == "groq":
            endpoint = "https://api.groq.com/openai/v1"
        elif payload.provider == "lmstudio":
            endpoint = "http://localhost:1234/v1"
        elif payload.provider == "ollama":
            endpoint = "http://localhost:11434/v1"
        elif payload.provider == "openai":
            endpoint = "https://api.openai.com/v1"
        elif payload.provider == "gemini":
            endpoint = "https://generativelanguage.googleapis.com/v1beta/openai"
        elif payload.provider == "nvidia":
            endpoint = "https://integrate.api.nvidia.com/v1"
        else:
            endpoint = "http://localhost:1234/v1"

    auth_token = payload.apiKey or (
        "lm-studio" if payload.provider == "lmstudio"
        else "ollama" if payload.provider == "ollama"
        else ""
    )
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    start_time = time.time()
    clean_endpoint = endpoint.rstrip("/")
    if not clean_endpoint.endswith("/v1") and payload.provider in ("lmstudio", "ollama", "custom"):
        clean_endpoint = f"{clean_endpoint}/v1"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=2.0)) as client:
            # 1. Try GET /models (OpenAI / LM Studio standard)
            models_url = f"{clean_endpoint}/models"
            try:
                res = await client.get(models_url, headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)
                if res.status_code == 200:
                    data = res.json()
                    raw_models = data.get("data", [])
                    model_names = [m.get("id") for m in raw_models if isinstance(m, dict) and "id" in m]
                    if not model_names and "models" in data:
                        model_names = [m.get("name") for m in data["models"] if isinstance(m, dict) and "name" in m]
                    return TestLLMResponse(
                        success=True,
                        latencyMs=latency_ms,
                        message=f"Connected to {payload.provider.upper()} successfully at {clean_endpoint}!",
                        modelsAvailable=model_names[:15] if model_names else None,
                    )
            except Exception:
                pass

            # 1b. For Ollama: Try GET /api/tags
            if payload.provider == "ollama":
                try:
                    base_no_v1 = clean_endpoint.replace("/v1", "")
                    res_tags = await client.get(f"{base_no_v1}/api/tags", headers=headers)
                    if res_tags.status_code == 200:
                        tag_data = res_tags.json()
                        tag_models = [m.get("name") for m in tag_data.get("models", []) if isinstance(m, dict) and "name" in m]
                        if tag_models:
                            latency_ms = int((time.time() - start_time) * 1000)
                            return TestLLMResponse(
                                success=True,
                                latencyMs=latency_ms,
                                message=f"Connected to OLLAMA successfully at {clean_endpoint}!",
                                modelsAvailable=tag_models[:15],
                            )
                except Exception:
                    pass

            # 2. Try POST /chat/completions with minimal ping
            chat_url = f"{clean_endpoint}/chat/completions"
            test_model = payload.model
            if not test_model or test_model in ("local-model", ""):
                test_model = (
                    "qwen/qwen3.8-27b" if payload.provider == "groq"
                    else "gemini-2.5-flash" if payload.provider == "gemini"
                    else "meta/llama-3.3-70b-instruct" if payload.provider == "nvidia"
                    else "gpt-4o" if payload.provider == "openai"
                    else "local-model"
                )
            elif payload.provider == "gemini" and test_model in ("gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-2.0"):
                test_model = "gemini-2.5-flash"

            res2 = await client.post(
                chat_url,
                headers=headers,
                json={
                    "model": test_model,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
            )
            # Automatic fallback if the selected model returned 404 (e.g. decommissioned or unavailable)
            if res2.status_code == 404:
                fallback_candidate = None
                if payload.provider == "groq" and test_model != "qwen/qwen3.8-27b":
                    fallback_candidate = "qwen/qwen3.8-27b"
                elif payload.provider == "gemini" and test_model != "gemini-2.5-flash":
                    fallback_candidate = "gemini-2.5-flash"
                elif payload.provider == "nvidia" and test_model != "meta/llama-3.1-8b-instruct":
                    fallback_candidate = "meta/llama-3.1-8b-instruct"

                if fallback_candidate:
                    test_model = fallback_candidate
                    res2 = await client.post(
                        chat_url,
                        headers=headers,
                        json={
                            "model": test_model,
                            "messages": [{"role": "user", "content": "ping"}],
                            "max_tokens": 1,
                        },
                    )

            latency_ms = int((time.time() - start_time) * 1000)

            if res2.status_code == 200:
                note = f" (switched from '{payload.model}' which was unavailable)" if test_model != payload.model else ""
                return TestLLMResponse(
                    success=True,
                    latencyMs=latency_ms,
                    message=f"Connected to {payload.provider.upper()} ({test_model}){note} successfully!",
                )
            elif res2.status_code == 401:
                return TestLLMResponse(
                    success=False,
                    latencyMs=latency_ms,
                    message="Authentication error (401). Please check your API key.",
                )
            else:
                return TestLLMResponse(
                    success=False,
                    latencyMs=latency_ms,
                    message=f"Endpoint returned HTTP {res2.status_code}: {res2.text[:120]}",
                )
    except httpx.ConnectError:
        return TestLLMResponse(
            success=False,
            latencyMs=0,
            message=f"Connection refused at {endpoint}. Ensure your local server (e.g. LM Studio / Ollama) is started and listening.",
        )
    except Exception as e:
        return TestLLMResponse(
            success=False,
            latencyMs=0,
            message=f"Verification failed: {str(e)}",
        )
