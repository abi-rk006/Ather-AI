from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..models.user import UserProfile, UserCreate
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.firestore_service import firestore_service

router = APIRouter(prefix="/api/auth", tags=["Authentication & Profile"])


class AdminLoginRequest(BaseModel):
    email: EmailStr = "admin@annauniv.edu"
    password: Optional[str] = None
    passcode: Optional[str] = None


@router.post("/admin-login")
async def admin_login(payload: AdminLoginRequest):
    """
    Authenticate administrator credentials.
    Grants admin privileges to manage and upload public authorized curriculum textbooks.
    """
    valid_passwords = ["admin123", "anna_admin_2024", "admin@annauniv.edu", "admin"]
    if payload.password in valid_passwords or (payload.passcode and payload.passcode in valid_passwords):
        admin_profile = UserProfile(
            user_id="admin_curriculum_01",
            email=payload.email,
            display_name="Curriculum Administrator",
            role="admin",
            department="Curriculum and Academic Courses",
            semester=None,
        )
        await firestore_service.save_user(admin_profile)
        return {
            "token": "admin_session_auth_token",
            "user": admin_profile.model_dump(mode="json"),
            "role": "admin",
            "message": "Administrator authenticated successfully."
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid administrator credentials or passcode.",
    )


@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get current authenticated user profile from `users/{userId}`.
    """
    profile = await firestore_service.get_user(current_user.uid)
    if not profile:
        profile = UserProfile(
            user_id=current_user.uid,
            email=current_user.email,
            display_name=current_user.display_name,
            role="admin" if current_user.is_admin else "student",
            department="Curriculum and Academic Courses" if current_user.is_admin else "Computer Science and Engineering",
        )
        await firestore_service.save_user(profile)
    elif current_user.is_admin and profile.role != "admin":
        profile.role = "admin"
        await firestore_service.save_user(profile)
    return profile


@router.post("/profile", response_model=UserProfile)
async def create_or_update_profile(
    user_data: UserCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update or initialize user profile in Firestore.
    """
    profile = UserProfile(
        user_id=current_user.uid,
        email=user_data.email,
        display_name=user_data.display_name,
        role=user_data.role or "student",
        department=user_data.department or "Computer Science and Engineering",
        semester=user_data.semester or 6,
    )
    return await firestore_service.save_user(profile)
