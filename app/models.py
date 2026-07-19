from datetime import datetime

from sqlalchemy import Integer, Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)

    documents = relationship("Document", back_populates="owner")
    conversations = relationship("Conversation", back_populates="owner")
    flashcards = relationship("FlashCard", back_populates="owner")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    page_count = Column(Integer)

    owner = relationship("User", back_populates="documents")
    flashcards = relationship("FlashCard", back_populates="document")


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="conversations")
    document = relationship("Document")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String)  # "user" or "assistant"
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

class FlashCard(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    user_id=Column(Integer, ForeignKey("users.id"))
    question=Column(String,nullable=False)
    answer=Column(String,nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document",back_populates="flashcards")
    owner = relationship("User", back_populates="flashcards")
