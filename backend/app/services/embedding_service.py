import asyncio
import hashlib
import logging
import math
import os
from typing import List, Optional
import httpx

from ..config import settings

logger = logging.getLogger("anna_rag.embeddings")

JINA_URL = getattr(settings, "JINA_URL", "https://api.jina.ai/v1/embeddings")
MODEL = getattr(settings, "JINA_EMBEDDING_MODEL", "jina-embeddings-v5-text-small")
DIMENSIONS = getattr(settings, "JINA_EMBEDDING_DIMENSIONS", 1024)


def _generate_deterministic_vector(text: str, dimensions: int = 1024) -> List[float]:
    """
    Generates a deterministic 1024-dimensional normalized vector for local development/testing
    when JINA_API_KEY is not yet populated by the user.
    """
    vec = []
    # Seed using SHA256 hashes of the text across dimension chunks
    text_bytes = text.encode("utf-8")
    for i in range(dimensions):
        h = hashlib.sha256(text_bytes + str(i).encode("utf-8")).digest()
        val = int.from_bytes(h[:4], byteorder="big", signed=True) / (2**31)
        vec.append(val)
    
    # L2 normalize so cosine similarity behaves correctly
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def is_jina_key_configured() -> bool:
    api_key = settings.JINA_API_KEY or os.getenv("JINA_API_KEY", "")
    return bool(api_key and api_key != "your_jina_api_key" and len(api_key.strip()) > 5)


async def embed_texts(
    texts: List[str],
    task: str = "retrieval.passage",
    max_retries: int = 3,
) -> List[List[float]]:
    """
    Generate embeddings for texts using Jina API (jina-embeddings-v5-text-small).
    
    Args:
        texts: List of strings to embed
        task: 'retrieval.passage' for documents/child chunks, 'retrieval.query' for questions
        max_retries: Number of retry attempts for transient errors / rate limits
        
    Returns:
        List of 1024-dimensional embedding vectors matching the order of input texts.
    """
    if not texts:
        return []

    api_key = settings.JINA_API_KEY or os.getenv("JINA_API_KEY", "")

    if not is_jina_key_configured():
        logger.warning(
            "JINA_API_KEY is using placeholder 'your_jina_api_key'. "
            f"Generating deterministic 1024-dim mock vectors for {len(texts)} text(s). "
            "Please update JINA_API_KEY in backend/.env with your key from https://jina.ai/"
        )
        return [_generate_deterministic_vector(t, DIMENSIONS) for t in texts]

    # Live Jina API call with bounded retries and exponential backoff
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=60.0) as http:
                response = await http.post(
                    JINA_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": MODEL,
                        "input": texts,
                        "task": task,
                        "dimensions": DIMENSIONS,
                    },
                )

                if response.status_code == 429:  # Rate limited
                    retry_after = float(response.headers.get("Retry-After", 2 ** attempt))
                    logger.warning(f"Jina API rate limit reached (429). Retrying after {retry_after}s...")
                    await asyncio.sleep(retry_after)
                    continue

                response.raise_for_status()
                data = response.json()
                items = data.get("data", [])
                
                # Sort by original input index to guarantee exact ordering
                items.sort(key=lambda item: item["index"])
                return [item["embedding"] for item in items]

        except (httpx.RequestError, httpx.HTTPStatusError) as err:
            logger.warning(f"Jina API request failed (attempt {attempt + 1}/{max_retries}): {err}")
            if attempt == max_retries - 1:
                logger.error("Jina API failed after max retries. Falling back to deterministic embeddings.")
                return [_generate_deterministic_vector(t, DIMENSIONS) for t in texts]
            await asyncio.sleep(1.5 ** attempt)

    return [_generate_deterministic_vector(t, DIMENSIONS) for t in texts]
