from typing import List, Dict, Any, Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.export_service import export_service

router = APIRouter(prefix="/api/exports", tags=["Exports"])


class ExportRequest(BaseModel):
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    format: Literal["txt", "md", "chatgpt_prompt"] = "txt"
    question: str = "Anna University Exam Syllabus Topic"


@router.post("")
async def export_retrieved_evidence(
    request: ExportRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Export retrieved passages as plain TXT, formatted Markdown, or ready-to-paste ChatGPT prompt.
    """
    return export_service.format_passages(
        citations=request.citations,
        format_type=request.format,
        question=request.question,
    )
