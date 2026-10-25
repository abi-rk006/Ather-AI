from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from ..models.chat import ChatRequest, ChatResponse
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.chat_service import chat_service

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def submit_chat_message(
    request: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Submits a syllabus/study question in Mode 1 (Exam Mode), Mode 2 (Explain Mode), or Mode 3 (Retrieval Mode).
    Saves user message and assistant answer to Firestore subcollections:
    `users/{userId}/sessions/{sessionId}/messages/{messageId}`
    """
    return await chat_service.generate_response(request, user_id=current_user.uid)


@router.post("/stream")
async def stream_chat_message(
    request: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Streams generated answers token-by-token using Server-Sent Events (SSE).
    """
    generator = chat_service.stream_response(request, user_id=current_user.uid)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
