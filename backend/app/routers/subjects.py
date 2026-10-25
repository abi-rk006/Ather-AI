import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.subject import Subject, SubjectCreate
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.firestore_service import firestore_service

router = APIRouter(prefix="/api/subjects", tags=["Curriculum Subjects"])


@router.get("", response_model=List[Subject])
async def list_subjects(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    List Anna University curriculum subjects (accessible to all students and administrators).
    """
    return await firestore_service.list_subjects()


@router.post("", response_model=Subject, status_code=status.HTTP_201_CREATED)
async def create_subject(
    payload: SubjectCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Add a new Anna University curriculum subject (e.g. UI/UX Design, Big Data Analytics BDA).
    RESTRICTED: Administrators ONLY. Students will receive HTTP 403 Forbidden.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only administrators can add curriculum subjects.",
        )

    # Generate a clean subject ID from code (e.g. "CS3001" -> "cs3001", "UI/UX" -> "uiux")
    cleaned_code = re.sub(r"[^a-zA-Z0-9]", "", payload.code.lower())
    subject_id = cleaned_code or f"subj_{payload.name.lower()[:8]}"

    new_subject = Subject(
        subject_id=subject_id,
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        department=payload.department.strip().upper(),
        semester=payload.semester,
        textbook_ids=[],
        description=payload.description or f"Anna University Regulation 2021 curriculum: {payload.name.strip()}",
    )

    await firestore_service.save_subject(new_subject)
    return new_subject


@router.delete("/{subject_id}", status_code=status.HTTP_200_OK)
async def delete_subject(
    subject_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete a curriculum subject.
    RESTRICTED: Administrators ONLY.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only administrators can delete curriculum subjects.",
        )

    deleted = await firestore_service.delete_subject(subject_id)
    return {"success": deleted, "message": f"Subject {subject_id} deleted."}
