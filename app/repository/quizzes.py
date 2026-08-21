from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from app import models
from app.rag.chains import quiz_chain

def generate_and_save_quiz(user_id:int,document_ids:list[int],difficulty:str,count:int,db:Session):
    documents=db.query(models.Document).filter(models.Document.id.in_(document_ids)).all()
    if len(documents)!=len(document_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="One or more documents not found")

    for document in documents:
        if document.user_id!=user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    questions,topic,time_estimate_minutes=quiz_chain.generate_quiz(user_id,document_ids,difficulty,count)

    quiz=models.Quiz(
        user_id=user_id,
        topic=topic,
        difficulty=difficulty,
        question_count=count,
        time_estimate_minutes=time_estimate_minutes,
        documents=documents          
    )    

    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    saved_questions=[]

    for question in questions:
        quiz_question=models.QuizQuestion(
            quiz_id=quiz.id,
            question=question["question"],
            type=question["type"],
            answer=question["answer"],
        )

        db.add(quiz_question)
        saved_questions.append(quiz_question)

    db.commit()

    for question in saved_questions:
        db.refresh(question)

    quiz.questions=saved_questions
    return quiz

def get_quizzes(user_id:int,db:Session):
    return db.query(models.Quiz).filter(models.Quiz.user_id==user_id).all()

def get_quiz(quiz_id:int,user_id:int,db:Session):
    quiz=db.query(models.Quiz).filter(models.Quiz.id==quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Quiz not found")

    if quiz.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    return quiz

def grade_quiz(user_answers:list[str],quiz_id:int,user_id:int,db:Session):
    quiz=db.query(models.Quiz).filter(models.Quiz.id==quiz_id).first()

    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Quiz not found")

    if quiz.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    quiz_questions=db.query(models.QuizQuestion).filter(models.QuizQuestion.quiz_id==quiz_id).all()
    questions=[]
    answers=[]

    for quiz_question in quiz_questions:
        questions.append(quiz_question.question)
        answers.append(quiz_question.answer)

    result = quiz_chain.grade_quiz(questions,answers,user_answers)
    quiz.solved=True
    db.commit()

    return result

def delete_quiz(quiz_id:int,user_id:int,db:Session):
    quiz=get_quiz(quiz_id,user_id,db)

    db.delete(quiz)
    db.commit()