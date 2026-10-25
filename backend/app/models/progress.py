from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class TopicProgress(BaseModel):
    progress_id: str
    user_id: str
    subject_id: str
    topic_name: str
    is_completed: bool = False
    mastery_percentage: int = 0
    practice_score: Optional[float] = None
    last_studied_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
