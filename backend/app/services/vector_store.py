import logging
import os
from typing import Optional
import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

from ..config import settings

logger = logging.getLogger("anna_rag.vector_store")


class VectorStoreService:
    """
    Chroma Cloud & Local Vector Store Service.
    Connects to Chroma Cloud when API credentials are provided,
    with automatic fallback to local PersistentClient during offline/dev mode.
    """

    def __init__(self):
        self._client: Optional[ClientAPI] = None
        self._collection: Optional[Collection] = None
        self._is_cloud: bool = False
        self._initialize_client()

    def _is_cloud_configured(self) -> bool:
        api_key = settings.CHROMA_API_KEY or os.getenv("CHROMA_API_KEY", "")
        tenant = settings.CHROMA_TENANT or os.getenv("CHROMA_TENANT", "")
        database = settings.CHROMA_DATABASE or os.getenv("CHROMA_DATABASE", "")

        placeholder_indicators = ["your_chroma_cloud_api_key", "your_tenant_id", "your_database_name", ""]
        return bool(api_key and tenant and database and api_key not in placeholder_indicators and tenant not in placeholder_indicators)

    def _initialize_client(self):
        try:
            if self._is_cloud_configured():
                logger.info(
                    f"Connecting to Chroma Cloud (tenant={settings.CHROMA_TENANT}, database={settings.CHROMA_DATABASE})..."
                )
                self._client = chromadb.CloudClient(
                    tenant=settings.CHROMA_TENANT,
                    database=settings.CHROMA_DATABASE,
                    api_key=settings.CHROMA_API_KEY,
                )
                self._is_cloud = True
                logger.info("Successfully connected to Chroma Cloud managed vector database.")
            else:
                logger.info(
                    "Chroma Cloud credentials not set or using placeholders. "
                    "Falling back to local Chroma PersistentClient (./chroma_db). "
                    "Update CHROMA_API_KEY, CHROMA_TENANT, and CHROMA_DATABASE in .env to connect to Chroma Cloud."
                )
                os.makedirs(settings.CHROMA_LOCAL_PATH, exist_ok=True)
                self._client = chromadb.PersistentClient(path=settings.CHROMA_LOCAL_PATH)
                self._is_cloud = False

            # Get or create the anna_university_child_chunks_v1 collection with Cosine similarity
            self._collection = self._client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                f"Chroma collection '{settings.CHROMA_COLLECTION_NAME}' active (Cosine similarity). Total indexed vectors: {self._collection.count()}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Chroma Cloud client: {e}. Falling back to in-memory/persistent client.", exc_info=True)
            try:
                os.makedirs(settings.CHROMA_LOCAL_PATH, exist_ok=True)
                self._client = chromadb.PersistentClient(path=settings.CHROMA_LOCAL_PATH)
                self._collection = self._client.get_or_create_collection(
                    name=settings.CHROMA_COLLECTION_NAME,
                    metadata={"hnsw:space": "cosine"},
                )
                self._is_cloud = False
            except Exception as inner_err:
                logger.critical(f"Fatal error initializing fallback vector store: {inner_err}")
                raise inner_err

    @property
    def client(self) -> ClientAPI:
        if self._client is None:
            self._initialize_client()
        return self._client

    @property
    def collection(self) -> Collection:
        if self._collection is None:
            self._initialize_client()
        return self._collection

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
