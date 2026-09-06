import json
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator, ConfigDict, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Must be at least 8 characters")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Must contain an uppercase letter")
        if not re.search(r"[a-z]", value):
            raise ValueError("Must contain a lowercase letter")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise ValueError("Must contain a special character")
        return value


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: str
    password: str


class DocumentResponse(BaseModel):
    id: int
    filename: str
    upload_date: datetime
    page_count: int | None
    source_type: str
    model_config = ConfigDict(from_attributes=True)


class YouTubeDocumentRequest(BaseModel):
    url: str


class WebDocumentRequest(BaseModel):
    url: str


class ConversationCreate(BaseModel):
    document_id: Optional[int] = None


class ConversationResponse(BaseModel):
    id: int
    document_id: Optional[int]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    content: str


class SourceCitation(BaseModel):
    source_type: str
    source_url: str | None = None
    timestamp_seconds: int | None = None
    timestamp_delay: str | None = None
    link: str | None = None
    filename: str | None = None
    page: int | None = None
    slide: int | None = None


class ConversationResponse(BaseModel):
    id: int
    document_id: Optional[int]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime
    sources: list[SourceCitation]
    model_config = ConfigDict(from_attributes=True)

    @field_validator("sources", mode="before")
    @classmethod
    def parse_sources(cls, value):
        if isinstance(value, str):
            return json.loads(value)
        if value is None:
            return []
        return value


class FlashCardResponse(BaseModel):
    id: int
    type: str
    question: str
    answer: str
    created_at: datetime
    document_ids: list[int]
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_document_ids(cls, obj):
        if hasattr(obj, "documents"):
            return {
                "id": obj.id,
                "type": obj.type,
                "question": obj.question,
                "answer": obj.answer,
                "created_at": obj.created_at,
                "document_ids": [d.id for d in obj.documents],
            }
        return obj


class FlashCardGenerateRequest(BaseModel):
    count: int = 10  # how many flash cards
    document_ids: list[int]


class FlashCardAnswerRequest(BaseModel):
    user_answer: str


class FlashCardAnswerResponse(BaseModel):
    correct: bool
    correct_answer: str
    feedback: str


class StudyPlanGenerateRequest(BaseModel):
    document_ids: list[int]


class StudyPlanItemResponse(BaseModel):
    id: int
    topic: str
    priority: str
    estimated_time: int
    subtopics: list[str]
    completed: bool

    model_config = ConfigDict(from_attributes=True)

    @field_validator("subtopics", mode="before")
    @classmethod
    def parse_subtopics(cls, value):
        if isinstance(value, str):
            return json.loads(value)
        return value


class StudyPlanResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    items: list[StudyPlanItemResponse]
    document_ids: list[int]
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_document_ids(cls, obj):
        if hasattr(obj, "documents"):
            return {
                "id": obj.id,
                "title": obj.title,
                "created_at": obj.created_at,
                "items": obj.items,
                "document_ids": [d.id for d in obj.documents],
            }
        return obj


class StudyPlanItemUpdate(BaseModel):
    completed: bool


class QuizGenerateRequest(BaseModel):
    document_ids: list[int]
    count: int = 10
    difficulty: str

    @field_validator("document_ids")
    @classmethod
    def validate_not_empty(cls, value):
        if not value:
            raise ValueError("Must specify at least one document ID")
        return value


class QuizQuestionResponse(BaseModel):
    id: int
    type: str
    question: str
    answer: str


class QuizResponse(BaseModel):
    id: int
    topic: str
    created_at: datetime
    time_estimate_minutes: int
    difficulty: str
    question_count: int
    questions: list[QuizQuestionResponse]
    document_ids: list[int]
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_document_ids(cls, obj):
        if hasattr(obj, "documents"):
            return {
                "id": obj.id,
                "topic": obj.topic,
                "created_at": obj.created_at,
                "time_estimate_minutes": obj.time_estimate_minutes,
                "difficulty": obj.difficulty,
                "question_count": obj.question_count,
                "questions": obj.questions,
                "document_ids": [d.id for d in obj.documents],
            }
        return obj


class QuizGradeRequest(BaseModel):
    answers: list[str]


class QuestionGradeResponse(BaseModel):
    correct: bool
    correct_answer: str
    feedback: str


class QuizGradeResponse(BaseModel):
    score: int
    total: int
    results: list[QuestionGradeResponse]


class CheatSheetGenerateRequest(BaseModel):
    document_ids: list[int]


class CheatSheetResponse(BaseModel):
    id: int
    title: str
    topic: str
    content: str
    created_at: datetime
    document_ids: list[int]
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_document_ids(cls, obj):
        if hasattr(obj, "documents"):
            document_ids = [d.id for d in obj.documents]
            return {
                "id": obj.id,
                "title": obj.title,
                "topic": obj.topic,
                "content": obj.content,
                "created_at": obj.created_at,
                "document_ids": document_ids,
            }
        return obj
