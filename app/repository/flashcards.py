from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app import models
from app.rag.chains import flashcard_chain


def generate_and_save_flashcards(document_ids:list[int],user_id:int,count:int,db:Session):
    documents=db.query(models.Document).filter(models.Document.id.in_(document_ids)).all()
    if len(documents)!=len(document_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="One or more documents not found")
    
    for document in documents:
        if document.user_id!=user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    generated=flashcard_chain.generate_flashcards(user_id,document_ids,count)

    saved_flashcards=[]

    for item in generated:
        card=models.FlashCard(user_id=user_id,type=item["type"],question=item["question"],answer=item["answer"],documents=documents)
        db.add(card)
        saved_flashcards.append(card)

    db.commit()

    for card in saved_flashcards:
        db.refresh(card)

    return saved_flashcards

def get_flashcards(user_id:int,db:Session):
    return db.query(models.FlashCard).filter(models.FlashCard.user_id==user_id).all()

def answer_flashcard(flashcard_id,user_id,user_answer:str,db:Session):
    flashcard=db.query(models.FlashCard).filter(models.FlashCard.id == flashcard_id).first()

    if not flashcard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Flashcard not found")

    if flashcard.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized")

    result=flashcard_chain.grade_flashcard_answer(flashcard.question,flashcard.answer,user_answer)

    return {
        "correct": result["correct"],
        "correct_answer": flashcard.answer,
        "feedback": result["feedback"]
    }

def get_flashcard(flashcard_id:int,user_id:int,db:Session):
    flashcard=db.query(models.FlashCard).filter(models.FlashCard.id==flashcard_id).first()

    if not flashcard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Flashcard not found")

    if flashcard.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="User not authorized")

    return flashcard

def delete_flash_card(flashcard_id:int,user_id:int,db:Session):
    flashcard=get_flashcard(flashcard_id,user_id,db)
    db.delete(flashcard)
    db.commit()
    