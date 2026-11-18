import logging
import os
import uuid
from typing import Optional, List, Dict, Any

from ..config import settings

logger = logging.getLogger("anna_rag.vector_store")


def _chunk_id_to_uuid(chunk_id: str) -> str:
    """Generates a deterministic RFC 4122 UUID from a string chunk ID."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(chunk_id)))


class QdrantCollectionAdapter:
    """
    Adapter providing a clean, consistent interface over a Qdrant collection.
    Compatible with the existing indexing and retrieval pipelines.
    """

    def __init__(self, client, collection_name: str):
        self._client = client
        self._collection_name = collection_name

    def upsert(
        self,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ):
        from qdrant_client.http import models

        points = []
        metadatas = metadatas or [{} for _ in ids]

        for chunk_id, doc, vec, meta in zip(ids, documents, embeddings, metadatas):
            payload = dict(meta) if meta else {}
            payload["chunk_id"] = chunk_id
            payload["text"] = doc

            # Sanitize values to ensure JSON/Qdrant compatibility
            sanitized_payload = {}
            for k, v in payload.items():
                if isinstance(v, (str, int, float, bool)):
                    sanitized_payload[k] = v
                elif v is None:
                    continue
                else:
                    sanitized_payload[k] = str(v)

            point_id = _chunk_id_to_uuid(chunk_id)
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=vec,
                    payload=sanitized_payload,
                )
            )

        self._client.upsert(collection_name=self._collection_name, points=points)

    def _build_filter(self, where: Optional[Dict[str, Any]]):
        from qdrant_client.http import models

        if not where:
            return None

        conditions = []
        if "$and" in where:
            for sub_clause in where["$and"]:
                for key, val in sub_clause.items():
                    conditions.append(
                        models.FieldCondition(key=key, match=models.MatchValue(value=val))
                    )
        else:
            for key, val in where.items():
                if key.startswith("$"):
                    continue
                conditions.append(
                    models.FieldCondition(key=key, match=models.MatchValue(value=val))
                )

        return models.Filter(must=conditions) if conditions else None

    def query(
        self,
        query_embeddings: List[List[float]],
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None,
        include: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not query_embeddings or len(query_embeddings[0]) == 0:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        query_vec = query_embeddings[0]
        q_filter = self._build_filter(where)

        try:
            res = self._client.query_points(
                collection_name=self._collection_name,
                query=query_vec,
                query_filter=q_filter,
                limit=n_results,
                with_payload=True,
                with_vectors=False,
            )
            points = res.points
        except Exception as e:
            logger.warning(f"Qdrant filtered query failed ({e}); retrying without filter.")
            try:
                res = self._client.query_points(
                    collection_name=self._collection_name,
                    query=query_vec,
                    limit=n_results,
                    with_payload=True,
                    with_vectors=False,
                )
                points = res.points
            except Exception as e2:
                logger.error(f"Qdrant unfiltered query also failed: {e2}")
                return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        ret_ids = []
        ret_docs = []
        ret_metas = []
        ret_distances = []

        for pt in points:
            payload = pt.payload or {}
            chunk_id = payload.get("chunk_id", str(pt.id))
            text = payload.get("text", "")
            distance = max(0.0, 1.0 - (pt.score or 0.0))

            ret_ids.append(chunk_id)
            ret_docs.append(text)
            ret_metas.append(payload)
            ret_distances.append(distance)

        return {
            "ids": [ret_ids],
            "documents": [ret_docs],
            "metadatas": [ret_metas],
            "distances": [ret_distances],
        }

    def delete(self, where: Dict[str, Any]) -> None:
        from qdrant_client.http import models

        q_filter = self._build_filter(where)
        if q_filter:
            self._client.delete(
                collection_name=self._collection_name,
                points_selector=models.FilterSelector(filter=q_filter),
            )

    def count(self) -> int:
        try:
            info = self._client.get_collection(self._collection_name)
            return info.points_count or 0
        except Exception:
            return 0


class VectorStoreService:
    """
    Unified Vector Store Service supporting Qdrant (Docker / Cloud) and Chroma.
    Configured via settings.VECTOR_STORE_PROVIDER.
    """

    def __init__(self):
        self._client = None
        self._collection = None
        self._is_cloud: bool = False
        self._provider: str = "qdrant"
        self._initialize_client()

    def _initialize_client(self):
        provider = getattr(settings, "VECTOR_STORE_PROVIDER", "qdrant").lower()
        if provider == "qdrant":
            try:
                self._initialize_qdrant()
                return
            except Exception as e:
                logger.error(f"Failed to initialize Qdrant client: {e}. Falling back to Chroma...", exc_info=True)

        self._initialize_chroma()

    def _initialize_qdrant(self):
        from qdrant_client import QdrantClient
        from qdrant_client.http import models

        # Priority: explicit cluster endpoint (Qdrant Cloud) -> local docker QDRANT_URL
        url = settings.QDRANT_CLUSTER_ENDPOINT or settings.QDRANT_URL or "http://localhost:6333"
        api_key = settings.QDRANT_API_KEY or None

        logger.info(f"Connecting to Qdrant vector database at {url}...")
        self._client = QdrantClient(url=url, api_key=api_key, timeout=10)

        collection_name = settings.QDRANT_COLLECTION_NAME
        vector_size = settings.JINA_EMBEDDING_DIMENSIONS

        if not self._client.collection_exists(collection_name):
            logger.info(
                f"Creating Qdrant collection '{collection_name}' (vector size={vector_size}, metric=Cosine)..."
            )
            self._client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE,
                ),
            )

        self._collection = QdrantCollectionAdapter(self._client, collection_name)
        self._is_cloud = bool(settings.QDRANT_CLUSTER_ENDPOINT)
        self._provider = "qdrant"
        logger.info(
            f"Qdrant collection '{collection_name}' active. Total indexed vectors: {self._collection.count()}"
        )

    def _initialize_chroma(self):
        import chromadb
        api_key = settings.CHROMA_API_KEY or os.getenv("CHROMA_API_KEY", "")
        tenant = settings.CHROMA_TENANT or os.getenv("CHROMA_TENANT", "")
        database = settings.CHROMA_DATABASE or os.getenv("CHROMA_DATABASE", "")
        placeholder_indicators = ["your_chroma_cloud_api_key", "your_tenant_id", "your_database_name", ""]

        is_cloud_config = bool(
            api_key and tenant and database and api_key not in placeholder_indicators and tenant not in placeholder_indicators
        )

        try:
            if is_cloud_config:
                logger.info(f"Connecting to Chroma Cloud managed vector database (host: {settings.CHROMA_HOST}, tenant: {settings.CHROMA_TENANT})...")
                self._client = chromadb.CloudClient(
                    tenant=settings.CHROMA_TENANT,
                    database=settings.CHROMA_DATABASE,
                    api_key=settings.CHROMA_API_KEY,
                    cloud_host=getattr(settings, "CHROMA_HOST", "api.trychroma.com") or "api.trychroma.com",
                )
                self._is_cloud = True
            else:
                logger.info("Chroma Cloud credentials not set. Falling back to local Chroma PersistentClient (./chroma_db).")
                os.makedirs(settings.CHROMA_LOCAL_PATH, exist_ok=True)
                self._client = chromadb.PersistentClient(path=settings.CHROMA_LOCAL_PATH)
                self._is_cloud = False

            self._collection = self._client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            self._provider = "chroma"
            logger.info(
                f"Chroma collection '{settings.CHROMA_COLLECTION_NAME}' active. Total indexed vectors: {self._collection.count()}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Chroma: {e}. Using local persistent fallback.", exc_info=True)
            os.makedirs(settings.CHROMA_LOCAL_PATH, exist_ok=True)
            self._client = chromadb.PersistentClient(path=settings.CHROMA_LOCAL_PATH)
            self._collection = self._client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            self._provider = "chroma"
            self._is_cloud = False

    @property
    def client(self):
        if self._client is None:
            self._initialize_client()
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._initialize_client()
        return self._collection

    @property
    def provider(self) -> str:
        return self._provider

    @property
    def is_cloud(self) -> bool:
        return self._is_cloud

    def count(self) -> int:
        """Returns total vector count in the collection."""
        try:
            return self.collection.count()
        except Exception:
            return 0


# Singleton vector store instance
vector_store = VectorStoreService()
collection = vector_store.collection
client = vector_store.client
