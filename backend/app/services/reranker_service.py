import logging
import os
import re
from typing import List, Dict, Any, Optional
import httpx

from ..config import settings

logger = logging.getLogger("anna_rag.reranker")


class RerankerService:
    """
    Stage 7: Neural Cross-Encoder Reranker Service.
    
    Re-scores candidate chunks retrieved from Stage 1 (Qdrant dense vector + BM25 sparse RRF).
    While bi-encoders calculate independent vectors for query and chunk, cross-encoders
    perform full token-level cross-attention across (query, passage) pairs, eliminating
    false positives and promoting chunks with exact syllabus relevance.
    
    Supported Engines:
    - Jina AI Neural Reranker v2 (jina-reranker-v2-base-multilingual)
    - Local Normalized Cross-Attention Fallback (for offline execution)
    """

    def __init__(self):
        self._provider = settings.RERANKER_PROVIDER
        self._model = settings.RERANKER_MODEL
        self._enabled = settings.RERANKER_ENABLED
        self._url = settings.RERANKER_URL

    async def _rerank_with_jina(
        self, query: str, candidates: List[Dict[str, Any]], top_n: int
    ) -> Optional[List[Dict[str, Any]]]:
        api_key = settings.JINA_API_KEY or os.getenv("JINA_API_KEY", "")
        if not api_key or api_key in ["your_jina_api_key", ""]:
            logger.debug("JINA_API_KEY not configured for reranking; using local fallback.")
            return None

        documents = [c.get("text", "") for c in candidates]
        if not documents:
            return candidates

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "query": query,
            "documents": documents,
            "top_n": min(top_n, len(documents)),
        }

        try:
            logger.info(
                f"Calling Jina Neural Reranker ({self._model}) for {len(documents)} candidate chunks..."
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self._url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("results", [])
                    if not results:
                        return None

                    reranked: List[Dict[str, Any]] = []
                    seen_indices = set()

                    for r in results:
                        idx = r.get("index")
                        score = float(r.get("relevance_score", 0.0))
                        if idx is not None and 0 <= idx < len(candidates):
                            cand = dict(candidates[idx])
                            cand["relevance_score"] = round(score, 4)
                            cand["reranker_score"] = round(score, 4)
                            cand["rerank_model"] = self._model
                            cand["reranked"] = True
                            reranked.append(cand)
                            seen_indices.add(idx)

                    # Append any remaining candidates that were beyond top_n
                    for idx, c in enumerate(candidates):
                        if idx not in seen_indices:
                            cand = dict(c)
                            cand["reranked"] = False
                            reranked.append(cand)

                    logger.info(
                        f"Jina Cross-Encoder reranked {len(reranked)} chunks. Top score: {reranked[0].get('relevance_score', 0)}"
                    )
                    return reranked
                else:
                    logger.warning(
                        f"Jina Reranker API returned status {res.status_code}: {res.text[:120]}"
                    )
        except Exception as e:
            logger.warning(f"Jina Reranker request failed ({e}); falling back to local scoring.")

        return None

    def _local_cross_encoder_rerank(
        self, query: str, candidates: List[Dict[str, Any]], top_n: int
    ) -> List[Dict[str, Any]]:
        """
        Local cross-attention heuristic that scores query-document pairs based on:
        1. Exact multi-word phrase matching
        2. Syllabus keyword density
        3. Heading hierarchy alignment with question intent
        4. Normalized RRF baseline fusion
        """
        tokens = [t.lower() for t in re.findall(r"\w+", query) if len(t) > 2]
        query_lower = query.lower()

        reranked = []
        for c in candidates:
            cand = dict(c)
            text = cand.get("text", "").lower()
            meta = cand.get("metadata", {})
            heading = (meta.get("heading_path") or "").lower()

            score = cand.get("rrf_score", 0.0) * 10.0  # base score

            # Exact phrase match boost
            if query_lower in text:
                score += 0.50
            elif any(len(phrase) > 6 and phrase in text for phrase in query_lower.split(" and ")):
                score += 0.30

            # Token overlap & density
            matched_tokens = sum(1 for t in tokens if t in text)
            if tokens:
                density = matched_tokens / len(tokens)
                score += density * 0.40

            # Heading relevance boost
            if any(t in heading for t in tokens):
                score += 0.20

            cand["relevance_score"] = round(min(0.99, max(0.05, score)), 4)
            cand["reranker_score"] = cand["relevance_score"]
            cand["rerank_model"] = "local-heuristic-cross-scorer"
            cand["reranked"] = True
            reranked.append(cand)

        reranked.sort(key=lambda x: x.get("relevance_score", 0.0), reverse=True)
        return reranked[:top_n]

    async def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_n: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Reranks candidate chunks using Neural Cross-Attention.
        """
        if not candidates:
            return []

        if not self._enabled or len(candidates) <= 1:
            return candidates[:top_n] if top_n else candidates

        target_n = top_n or len(candidates)

        # 1. Attempt Jina Neural Cross-Encoder Reranker v2
        if self._provider == "jina":
            jina_reranked = await self._rerank_with_jina(query, candidates, top_n=target_n)
            if jina_reranked:
                return jina_reranked[:target_n]

        # 2. Fall back to local cross-scoring
        return self._local_cross_encoder_rerank(query, candidates, top_n=target_n)


reranker_service = RerankerService()

