from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserProfile(BaseModel):
    user_id: str
    email: EmailStr
    display_name: str
    role: str = "student"  # "student", "faculty", "admin"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    department: Optional[str] = "Computer Science and Engineering"
    semester: Optional[int] = 6


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str
    role: Optional[str] = "student"
    department: Optional[str] = None
    semester: Optional[int] = None
