from datetime import datetime

from sqlalchemy import Integer, Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)

    documents = relationship("Document", back_populates="owner",cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="owner",cascade="all, delete-orphan")
    flashcards = relationship("FlashCard", back_populates="owner",cascade="all, delete-orphan")
    study_plan=relationship("StudyPlan", back_populates="owner",cascade="all, delete-orphan")
    quizzes=relationship("Quiz",back_populates="owner",cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    page_count = Column(Integer)

    owner = relationship("User", back_populates="documents")
    flashcards = relationship("FlashCard", back_populates="document",cascade="all, delete-orphan")
    conversations= relationship("Conversation",back_populates="document",cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="conversations")
    document = relationship("Document",back_populates="conversations")
    messages = relationship("Message", back_populates="conversation",cascade="all, delete-orphan")


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
    type=Column(String,nullable=False,default='qa')
    answer=Column(String,nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document",back_populates="flashcards")
    owner = relationship("User", back_populates="flashcards")

class StudyPlan(Base):
    __tablename__="study_plans"
    id=Column(Integer, primary_key=True)
    user_id=Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    owner=relationship("User", back_populates="study_plan")
    items=relationship("StudyPlanItem",back_populates="study_plan",cascade="all, delete-orphan")

class StudyPlanItem(Base):
    __tablename__="study_plan_items"
    id=Column(Integer, primary_key=True)
    study_plan_id = Column(Integer, ForeignKey("study_plans.id"))
    topic=Column(String,nullable=False)
    priority=Column(String,nullable=False)
    estimated_time=Column(Integer,nullable=False)
    subtopics=Column(String,nullable=False)
    completed=Column(Boolean,nullable=False,default=False)

    study_plan = relationship("StudyPlan", back_populates="items")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(Integer, primary_key=True)
    quiz_id=Column(Integer,ForeignKey("quizzes.id"))
    question=Column(String,nullable=False)
    type=Column(String,nullable=False,default='qa')
    answer=Column(String,nullable=False)

    quiz = relationship("Quiz",back_populates="questions")

class Quiz(Base):
    __tablename__ = "quizzes"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.id"))
    topic=Column(String,nullable=False)
    difficulty=Column(String,nullable=False)
    time_estimate_minutes=Column(Integer,nullable=False,default=30)
    question_count=Column(Integer,nullable=False,default=10)
    created_at=Column(DateTime,default=datetime.utcnow)

    questions=relationship("QuizQuestion",back_populates="quiz",cascade="all, delete-orphan")
    owner=relationship("User",back_populates="quizzes")