from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status

from app import schemas, oauth2, database
from app.repository import quizzes

router = APIRouter(
    prefix="/quizzes",
    tags=["quizzes"]
)

@router.post("/",status_code=status.HTTP_201_CREATED,response_model=schemas.QuizResponse)
def generate_quiz(request:schemas.QuizGenerateRequest,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return quizzes.generate_and_save_quiz(current_user.id,request.document_ids,request.difficulty,request.count,db)

@router.get('/',status_code=status.HTTP_200_OK,response_model=List[schemas.QuizResponse])
def get_quizzes(current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return quizzes.get_quizzes(current_user.id,db)

@router.get('/{quiz_id}',status_code=status.HTTP_200_OK,response_model=schemas.QuizResponse)
def get_quiz(quiz_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return quizzes.get_quiz(quiz_id,current_user.id,db)

@router.post('/{quiz_id}/grade',status_code=status.HTTP_201_CREATED,response_model=schemas.QuizGradeResponse)
def grade_quiz(request:schemas.QuizGradeRequest,quiz_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    score,results=quizzes.grade_quiz(request.answers,quiz_id,current_user.id,db)
    return {
        "score":score,
        "total":len(request.answers),
        "results":results
    }

@router.delete('/{quiz_id}',status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(quiz_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    quizzes.delete_quiz(quiz_id,current_user.id,db)