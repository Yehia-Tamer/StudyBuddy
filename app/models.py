from datetime import datetime

from sqlalchemy import Integer, Column, String, DateTime, ForeignKey, Boolean,Text,Table
from sqlalchemy.orm import relationship

from .database import Base

quiz_documents = Table(
    "quiz_documents", Base.metadata,
    Column("quiz_id", Integer, ForeignKey("quizzes.id"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True),
)

study_plan_documents = Table(
    "study_plan_documents", Base.metadata,
    Column("study_plan_id", Integer, ForeignKey("study_plans.id"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True),
)

cheat_sheet_documents = Table(
    "cheat_sheet_documents", Base.metadata,
    Column("cheat_sheet_id", Integer, ForeignKey("cheat_sheets.id"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True),
)

flashcard_documents=Table(
    "flashcard_documents",Base.metadata,
    Column("flashcard_id",Integer,ForeignKey("flashcards.id"),primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True)
)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)

    documents = relationship("Document", back_populates="owner",cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="owner",cascade="all, delete-orphan")
    flashcards = relationship("FlashCard", back_populates="owner",cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="owner",cascade="all, delete-orphan")
    quizzes=relationship("Quiz",back_populates="owner",cascade="all, delete-orphan")
    cheat_sheets=relationship("CheatSheet",back_populates="owner",cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    page_count = Column(Integer,nullable=True)
    source_type=Column(String, nullable=False,default="pdf")
    source_url=Column(String,nullable=True)

    owner = relationship("User", back_populates="documents")
    conversations= relationship("Conversation",back_populates="document",cascade="all, delete-orphan")
    flashcards_used_in = relationship("FlashCard", secondary=flashcard_documents, back_populates="documents")
    quizzes_used_in = relationship("Quiz", secondary=quiz_documents, back_populates="documents")
    study_plans_used_in = relationship("StudyPlan", secondary=study_plan_documents, back_populates="documents")
    cheat_sheets_used_in = relationship("CheatSheet", secondary=cheat_sheet_documents, back_populates="documents")

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
    sources = Column(Text,nullable=True)

    conversation = relationship("Conversation", back_populates="messages")

class FlashCard(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True)
    user_id=Column(Integer, ForeignKey("users.id"))
    question=Column(String,nullable=False)
    type=Column(String,nullable=False,default='qa')
    answer=Column(String,nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document",secondary=flashcard_documents,back_populates="flashcards_used_in")
    owner = relationship("User", back_populates="flashcards")

class StudyPlan(Base):
    __tablename__="study_plans"
    id=Column(Integer, primary_key=True)
    user_id=Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    owner=relationship("User", back_populates="study_plans")
    items=relationship("StudyPlanItem",back_populates="study_plan",cascade="all, delete-orphan")
    documents = relationship("Document", secondary=study_plan_documents, back_populates="study_plans_used_in")

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
    solved=Column(Boolean,nullable=False,default=False)
    created_at=Column(DateTime,default=datetime.utcnow)

    questions=relationship("QuizQuestion",back_populates="quiz",cascade="all, delete-orphan")
    owner=relationship("User",back_populates="quizzes")
    documents = relationship("Document", secondary=quiz_documents, back_populates="quizzes_used_in")

class CheatSheet(Base):
    __tablename__="cheat_sheets"

    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(Integer,ForeignKey("users.id"))
    title=Column(String,nullable=False)
    topic=Column(String,nullable=False)
    content=Column(Text,nullable=False)
    created_at=Column(DateTime,default=datetime.utcnow)

    owner=relationship("User",back_populates="cheat_sheets")
    documents = relationship("Document", secondary=cheat_sheet_documents, back_populates="cheat_sheets_used_in")
