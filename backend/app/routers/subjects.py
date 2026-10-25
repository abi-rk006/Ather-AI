from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.subject import Subject
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.firestore_service import firestore_service

router = APIRouter(prefix="/api/subjects", tags=["Curriculum Subjects"])


@router.get("", response_model=List[Subject])
async def list_subjects(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    List Anna University curriculum subjects and their associated prescribed textbooks.
    """
    return await firestore_service.list_subjects()
