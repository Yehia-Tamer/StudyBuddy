from typing import List

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from starlette import status

from app import schemas, oauth2, database
from app.repository import flashcards

router = APIRouter(tags=["Flashcards"],prefix="/flashcards")

@router.post('/',status_code=status.HTTP_201_CREATED,response_model=List[schemas.FlashCardResponse])
def generate_flashcards(request:schemas.FlashCardGenerateRequest,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.generate_and_save_flashcards(request.document_ids,current_user.id,request.count,db)

@router.get('/',status_code=status.HTTP_200_OK,response_model=List[schemas.FlashCardResponse])
def get_flashcards(current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.get_flashcards(current_user.id,db)

@router.get('/{flashcard_id}',status_code=status.HTTP_200_OK,response_model=schemas.FlashCardResponse)
def get_flashcard(flashcard_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.get_flashcard(flashcard_id,current_user.id,db)

@router.post('/{flashcard_id}/answer',status_code=status.HTTP_200_OK,response_model=schemas.FlashCardAnswerResponse)
def answer_flashcard(request:schemas.FlashCardAnswerRequest,flashcard_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.answer_flashcard(flashcard_id,current_user.id,request.user_answer,db)

@router.delete('/{flashcard_id}',status_code=status.HTTP_204_NO_CONTENT)
def delete_flashcard(flashcard_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.delete_flash_card(flashcard_id,current_user.id,db)