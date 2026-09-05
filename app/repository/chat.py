from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app import models
from app.rag.chains import chat_chain
import json

def create_conversation(user_id: int, document_id: int | None, db: Session):
    if document_id is not None:
        document = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        if document.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized")

    conversation = models.Conversation(user_id=user_id, document_id=document_id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def get_conversation(conversation_id: int, user_id: int, db: Session):
    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if conversation.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized")
    return conversation

def get_conversations(user_id:int,db:Session):
    return db.query(models.Conversation).filter(models.Conversation.user_id==user_id).all()

def delete_conversation(conversation_id:int,user_id:int,db:Session):
    conversation=get_conversation(conversation_id,user_id,db)
    db.delete(conversation)
    db.commit()

def save_message(conversation_id: int, user_id: int, role: str, content: str, db: Session, sources: list | None = None):
    get_conversation(conversation_id, user_id, db)

    message = models.Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources=json.dumps(sources) if sources is not None else None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def send_message(conversation_id: int, user_id: int, role: str, content: str, db: Session):
    conversation = get_conversation(conversation_id, user_id, db)

    save_message(conversation_id, user_id, "user", content, db)

    history = get_messages(conversation_id, user_id, db)[:-1]

    ai_answer, sources = chat_chain.ask_with_tools(content, user_id, conversation.document_id, history=history)

    ai_message = save_message(conversation_id, user_id, "assistant", ai_answer, db, sources=sources)

    return ai_message


def get_messages(conversation_id: int, user_id: int, db: Session):
    get_conversation(conversation_id, user_id, db)

    return (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.timestamp.asc())
        .all()
    )