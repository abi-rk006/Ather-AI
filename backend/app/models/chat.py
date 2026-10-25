from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


AnsweringMode = Literal["exam", "explain", "retrieval"]
SearchScope = Literal["textbook_only", "textbook_and_materials", "materials_only"]
ExamMarksFormat = Literal["2-mark", "13-mark"]


class CitationModel(BaseModel):
    id: str
    docTitle: str
    docType: str = "pdf"
    pageOrSection: str
    chunkText: str
    parentText: Optional[str] = None
    relevanceScore: float = 0.95
    topic: str = "Anna University Syllabus"
    chunkId: str
    bookReference: Optional[str] = None
    chapter: Optional[str] = None


class ChatRequest(BaseModel):
    prompt: str
    answeringMode: AnsweringMode = "exam"
    searchScope: SearchScope = "textbook_and_materials"
    examMarksFormat: ExamMarksFormat = "13-mark"
    sessionId: Optional[str] = None
    subjectId: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None


class ChatTelemetry(BaseModel):
    tokens: int = 1240
    tps: float = 58.4
    ttft: str = "1.2s"


class ChatResponse(BaseModel):
    response: str
    citations: List[CitationModel] = Field(default_factory=list)
    telemetry: ChatTelemetry = Field(default_factory=ChatTelemetry)
    sessionId: str
    messageId: str


class ChatSession(BaseModel):
    session_id: str
    user_id: str
    subject_id: Optional[str] = None
    title: str = "Study Discussion"
    selected_mode: AnsweringMode = "exam"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(BaseModel):
    message_id: str
    session_id: str
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    mode: Optional[AnsweringMode] = None
    exam_marks_format: Optional[ExamMarksFormat] = None
    search_scope: Optional[SearchScope] = None
    citations: List[CitationModel] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
