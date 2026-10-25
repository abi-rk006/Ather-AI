from typing import List, Optional
from pydantic import BaseModel, Field


class Subject(BaseModel):
    subject_id: str
    code: str  # e.g., "CS8591", "CS3001", "BDA801"
    name: str  # e.g., "Computer Networks", "UI/UX Design", "Big Data Analytics (BDA)"
    department: str = "CSE"
    semester: int = 5
    textbook_ids: List[str] = Field(default_factory=list)
    description: Optional[str] = None


class SubjectCreate(BaseModel):
    code: str
    name: str
    department: str = "CSE"
    semester: int = 5
    description: Optional[str] = None
