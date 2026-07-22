from typing import List

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from starlette import status

from app import schemas, oauth2, database
from app.repository import documents,flashcards

router = APIRouter(tags=["documents"],prefix="/documents")

@router.get('/',status_code=status.HTTP_200_OK,response_model=List[schemas.DocumentResponse])
def get_all_documents(current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return documents.get_user_documents(current_user.id,db)

@router.post('/',status_code=status.HTTP_201_CREATED,response_model=schemas.DocumentResponse)
def upload_document(file:UploadFile=File(...),current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return documents.create_document(file,current_user.id,db)

@router.delete('/{document_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int,current_user: schemas.UserResponse = Depends(oauth2.get_current_user),db: Session = Depends(database.get_db)):
    documents.delete_document(document_id, current_user.id, db)

@router.post('/flashcards',status_code=status.HTTP_201_CREATED,response_model=List[schemas.FlashCardResponse])
def generate_flashcards(request:schemas.FlashCardGenerateRequest,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.generate_and_save_flashcards(request.document_id,current_user.id,request.count,db)

@router.get('/flashcards',status_code=status.HTTP_200_OK,response_model=List[schemas.FlashCardResponse])
def get_flashcards(document_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.get_flashcards(document_id,current_user.id,db)

@router.post('/flashcards/{flashcard_id}/answer',status_code=status.HTTP_200_OK,response_model=schemas.FlashCardAnswerResponse)
def answer_flashcard(request:schemas.FlashCardAnswerRequest,flashcard_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return flashcards.answer_flashcard(flashcard_id,current_user.id,request.user_answer,db)