from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app import models
from app.rag import chain as rag_chain

def generate_quiz(user_id:int,document_ids:list[int],count:int,db:Session):
    documents=db.query(models.Document).filter(models.Document.id.in_(document_ids)).all()
    if len(document_ids)!=len(documents):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="One or more documents do not exist")
    for doc in documents:
        if doc.user_id!=user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User is not authorized")

    return rag_chain.generate_quiz(user_id, document_ids, count)

def grade_quiz(answers:list[dict]):
    results=[]
    score=0
    for item in answers:
        grade=rag_chain.grade_flashcard_answer(item["question"],item["correct_answer"],item["user_answer"])
        if grade["correct"]:
            score+=1
        results.append({
            "question": item["question"],
            "correct": grade["correct"],
            "correct_answer": item["correct_answer"],
            "feedback": grade["feedback"]
        })

    return {
            "score": score,
            "total": len(answers),
            "results": results
    }