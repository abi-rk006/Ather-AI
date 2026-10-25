from typing import Literal, Optional
from pydantic import BaseModel, Field
from .chat import AnsweringMode, SearchScope, ExamMarksFormat


class RetrievalSettingsModel(BaseModel):
    hybridVectorWeight: float = 0.70
    hybridBm25Weight: float = 0.30
    enableReranking: bool = True
    topK: int = 4
    parentChunkSize: int = 2000
    childChunkSize: int = 400


class UserPreferences(BaseModel):
    defaultAnsweringMode: AnsweringMode = "exam"
    defaultSearchScope: SearchScope = "textbook_and_materials"
    defaultExamMarksFormat: ExamMarksFormat = "13-mark"
    theme: Literal["light", "dark", "system"] = "system"
    selectedModel: str = "claude-3-5-sonnet"
    temperature: float = 0.2
    retrieval: RetrievalSettingsModel = Field(default_factory=RetrievalSettingsModel)


class UserPreferencesUpdate(BaseModel):
    defaultAnsweringMode: Optional[AnsweringMode] = None
    defaultSearchScope: Optional[SearchScope] = None
    defaultExamMarksFormat: Optional[ExamMarksFormat] = None
    theme: Optional[Literal["light", "dark", "system"]] = None
    selectedModel: Optional[str] = None
    temperature: Optional[float] = None
    retrieval: Optional[RetrievalSettingsModel] = None
