from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status
from app import schemas, oauth2,database
from app.repository import chat

router=APIRouter(tags=["chat"],prefix="/conversations")

@router.post('/',status_code=status.HTTP_201_CREATED,response_model=schemas.ConversationResponse)
def start_conversation(request:schemas.ConversationCreate,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return chat.create_conversation(current_user.id,request.document_id,db)

@router.post('/{conversation_id}/messages',status_code=status.HTTP_201_CREATED,response_model=schemas.MessageResponse)
def send_message(conversation_id:int,request:schemas.MessageCreate,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return chat.send_message(conversation_id,current_user.id,"user",request.content,db)


@router.get('/{conversation_id}/messages',status_code=status.HTTP_200_OK,response_model=List[schemas.MessageResponse])
def get_messages(conversation_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return chat.get_messages(conversation_id,current_user.id,db)
