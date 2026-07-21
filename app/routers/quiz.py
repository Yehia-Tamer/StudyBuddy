from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status

from app import schemas,oauth2,database
from app.repository import quiz

router = APIRouter(tags=["Quiz"],prefix="/quiz")

@router.post("/generate",status_code=status.HTTP_201_CREATED,response_model=schemas.QuizResponse)
def generate_quiz(request:schemas.QuizGenerateRequest,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    items = quiz.generate_quiz(current_user.id,request.document_ids,request.count,db)
    return {"time_limit_minutes":request.time_limit_minutes,"items":items}

@router.post("/grade",status_code=status.HTTP_201_CREATED,response_model=schemas.QuizGradeResponse)
def grade_quiz(request:schemas.QuizGradeRequest,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    answers = [item.model_dump() for item in request.answers]
    return quiz.grade_quiz(answers)
