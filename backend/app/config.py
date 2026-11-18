import json
import os
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Anna University RAG Study Assistant"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000", "https://ather-ai-iota.vercel.app"]

    # Firebase Admin SDK Configuration
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_PROJECT_ID: str = "anna-rag-study"
    FIREBASE_STORAGE_BUCKET: str = ""

    # Storage directory for local uploads fallback
    STORAGE_DIR: str = "./storage_uploads"

    # Jina AI Hosted Embeddings
    JINA_API_KEY: str = "your_jina_api_key"
    JINA_EMBEDDING_MODEL: str = "jina-embeddings-v5-text-small"
    JINA_EMBEDDING_DIMENSIONS: int = 1024
    JINA_URL: str = "https://api.jina.ai/v1/embeddings"

    # Stage 7: Neural Cross-Encoder Reranker Configuration
    RERANKER_ENABLED: bool = True
    RERANKER_PROVIDER: str = "jina"  # "jina" or "local"
    RERANKER_MODEL: str = "jina-reranker-v2-base-multilingual"
    RERANKER_URL: str = "https://api.jina.ai/v1/rerank"
    RERANKER_TOP_N: int = 4

    # Vector Store Provider ("qdrant" or "chroma")
    VECTOR_STORE_PROVIDER: str = "qdrant"

    # Qdrant Vector Database (Docker container on port 6333 or Qdrant Cloud)
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_CLUSTER_ENDPOINT: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = ""
    QDRANT_COLLECTION_NAME: str = "anna_university_child_chunks_v1"

    # LLM Inference Provider Configuration (Groq, LM Studio, Ollama, Custom URL, OpenAI, Gemini)
    LLM_PROVIDER: str = "groq"
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_API_KEY: str = ""
    LLM_FALLBACK_API_KEY: str = ""
    LLM_MODEL: str = "qwen/qwen3.8-27b"
    LLM_FALLBACK_MODEL: str = "qwen/qwen3.8-27b"
    LLM_FALLBACK_BASE_URL: Optional[str] = ""
    LLM_FALLBACK_PROVIDER: Optional[str] = ""
    LLM_TEMPERATURE: float = 0.2

    # Chroma Cloud Managed Vector Database (Optional Fallback)
    CHROMA_HOST: str = "api.trychroma.com"
    CHROMA_API_KEY: str = "your_chroma_cloud_api_key"
    CHROMA_TENANT: str = "your_tenant_id"
    CHROMA_DATABASE: str = "your_database_name"
    CHROMA_COLLECTION_NAME: str = "anna_university_child_chunks_v1"
    CHROMA_LOCAL_PATH: str = "./chroma_db"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            return json.loads(v)
        return v

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
