from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app import models
from app.rag import chain as rag_chain


def generate_and_save_flashcards(document_id:int,user_id:int,count:int,db:Session):
    document=db.query(models.Document).filter(models.Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if document.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized")

    generated=rag_chain.generate_flashcards(user_id,document_id,count)

    saved_flashcards=[]

    for item in generated:
        card=models.FlashCard(document_id=document_id,user_id=user_id,question=item["question"],answer=item["answer"])
        db.add(card)
        saved_flashcards.append(card)

    db.commit()

    for card in saved_flashcards:
        db.refresh(card)

    return saved_flashcards

def get_flashcards(user_id:int,document_id:int,db:Session):
    document=db.query(models.Document).filter(models.Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if document.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized")

    return db.query(models.FlashCard).filter(models.FlashCard.document_id == document_id).all()