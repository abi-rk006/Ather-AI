from typing import List, Optional
from pydantic import BaseModel, Field


class Subject(BaseModel):
    subject_id: str
    code: str  # e.g., "CS8591"
    name: str  # e.g., "Computer Networks"
    department: str = "CSE"
    semester: int = 5
    textbook_ids: List[str] = Field(default_factory=list)
    description: Optional[str] = None
