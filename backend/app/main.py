from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .config import settings
from .core.firebase import init_firebase, FIREBASE_AVAILABLE
from .routers import (
    auth_router,
    chat_router,
    retrieval_router,
    documents_router,
    exports_router,
    settings_router,
    subjects_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("anna_rag.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Firebase Admin SDK
    logger.info("Initializing Anna University RAG Study Assistant Backend...")
    init_firebase(
        credentials_path=settings.FIREBASE_CREDENTIALS_PATH,
        project_id=settings.FIREBASE_PROJECT_ID,
    )
    try:
        from .rag.chunking.store import chunk_store
        from .services.bm25_service import bm25_service
        existing_chunks = chunk_store.get_all_children()
        if existing_chunks:
            bm25_service.add_chunks(existing_chunks)
            logger.info(f"Preloaded {len(existing_chunks)} chunks into BM25 index on startup.")
    except Exception as e:
        logger.warning(f"Could not preload BM25 index: {e}")
    yield
    logger.info("Shutting down Anna University RAG Study Assistant Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Anna University RAG Study Assistant (Firebase Version 1)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration to connect cleanly with React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register All API Routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(retrieval_router)
app.include_router(documents_router)
app.include_router(exports_router)
app.include_router(settings_router)
app.include_router(subjects_router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint probed by frontend ApiClient.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "firebase_sdk_available": FIREBASE_AVAILABLE,
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
