import json
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator, ConfigDict, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Must be at least 8 characters")
        if not re.search(r'[A-Z]', value):
            raise ValueError("Must contain an uppercase letter")
        if not re.search(r'[a-z]', value):
            raise ValueError("Must contain a lowercase letter")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise ValueError("Must contain a special character")
        return value

class UserResponse(BaseModel):
    id:int
    username: str
    email: str
    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str
    password: str

class DocumentResponse(BaseModel):
    id:int
    filename: str
    upload_date:datetime
    page_count: int
    model_config = ConfigDict(from_attributes=True)

class ConversationCreate(BaseModel):
    document_id: Optional[int]=None

class ConversationResponse(BaseModel):
    id:int
    document_id:Optional[int]
    created_at:datetime
    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    content:str

class MessageResponse(BaseModel):
    id:int
    role:str
    content:str
    timestamp:datetime
    model_config = ConfigDict(from_attributes=True)

class FlashCardResponse(BaseModel):
    id:int
    type:str
    question:str
    answer:str
    created_at:datetime
    model_config = ConfigDict(from_attributes=True)

class FlashCardGenerateRequest(BaseModel):
    count: int = 10 #how many flash cards

class FlashCardAnswerRequest(BaseModel):
    user_answer:str

class FlashCardAnswerResponse(BaseModel):
    correct:bool
    correct_answer:str
    feedback:str

class StudyPlanGenerateRequest(BaseModel):
    document_ids: list[int]

class StudyPlanItemResponse(BaseModel):
    id: int
    topic: str
    priority: str
    estimated_time: int
    subtopics: list[str]
    completed:bool

    model_config = ConfigDict(from_attributes=True)

    @field_validator('subtopics', mode='before')
    @classmethod
    def parse_subtopics(cls, value):
        if isinstance(value, str):
            return json.loads(value)
        return value

class StudyPlanResponse(BaseModel):
    id:int
    created_at:datetime
    items:list[StudyPlanItemResponse]
    model_config = ConfigDict(from_attributes=True)

class StudyPlanItemUpdate(BaseModel):
    completed:bool

class QuizGenerateRequest(BaseModel):
    document_ids: list[int]
    count: int = 10
    time_limit_minutes: int = 10

    @field_validator('document_ids')
    @classmethod
    def validate_not_empty(cls, value):
        if not value:
            raise ValueError("Must specify at least one document ID")
        return value


class QuizItem(BaseModel):
    type: str
    question: str
    answer: str


class QuizResponse(BaseModel):
    time_limit_minutes: int
    items: list[QuizItem]


class QuizAnswerItem(BaseModel):
    question: str
    correct_answer: str
    user_answer: str


class QuizGradeRequest(BaseModel):
    answers: list[QuizAnswerItem]


class QuizItemResult(BaseModel):
    question: str
    correct: bool
    correct_answer: str
    feedback: str


class QuizGradeResponse(BaseModel):
    score: int
    total: int
    results: list[QuizItemResult]