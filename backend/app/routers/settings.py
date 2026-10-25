from fastapi import APIRouter, Depends
from ..models.settings import UserPreferences, UserPreferencesUpdate
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.firestore_service import firestore_service

router = APIRouter(prefix="/api/settings", tags=["Settings & Preferences"])


@router.get("", response_model=UserPreferences)
async def get_user_settings(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get user preferences from `users/{userId}/settings/preferences`.
    """
    return await firestore_service.get_preferences(user_id=current_user.uid)


@router.patch("", response_model=UserPreferences)
async def update_user_settings(
    update_data: UserPreferencesUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update user preferences in `users/{userId}/settings/preferences`.
    """
    current_prefs = await firestore_service.get_preferences(user_id=current_user.uid)
    updated_dict = current_prefs.model_dump()

    # Merge non-null fields
    update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)
    for k, v in update_dict.items():
        if isinstance(v, dict) and isinstance(updated_dict.get(k), dict):
            updated_dict[k].update(v)
        else:
            updated_dict[k] = v

    new_prefs = UserPreferences(**updated_dict)
    await firestore_service.update_preferences(user_id=current_user.uid, prefs=new_prefs)
    return new_prefs
