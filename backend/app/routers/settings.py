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
    model: str = "llama-3.3-70b-versatile"


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
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=2.0)) as client:
            # 1. Try GET /models
            models_url = f"{endpoint}/models"
            try:
                res = await client.get(models_url, headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)
                if res.status_code == 200:
                    data = res.json()
                    raw_models = data.get("data", [])
                    model_names = [m.get("id") for m in raw_models if isinstance(m, dict) and "id" in m]
                    return TestLLMResponse(
                        success=True,
                        latencyMs=latency_ms,
                        message=f"Connected to {payload.provider.upper()} successfully at {endpoint}!",
                        modelsAvailable=model_names[:10] if model_names else None,
                    )
            except Exception:
                pass

            # 2. Try POST /chat/completions with minimal ping
            chat_url = f"{endpoint}/chat/completions"
            res2 = await client.post(
                chat_url,
                headers=headers,
                json={
                    "model": payload.model,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
            )
            latency_ms = int((time.time() - start_time) * 1000)

            if res2.status_code == 200:
                return TestLLMResponse(
                    success=True,
                    latencyMs=latency_ms,
                    message=f"Connected to {payload.provider.upper()} ({payload.model}) successfully!",
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
