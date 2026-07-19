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
    question:str
    answer:str
    created_at:datetime
    model_config = ConfigDict(from_attributes=True)

class FlashCardGenerateRequest(BaseModel):
    count: int = 10 #how many flash cards