from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status

from app import schemas, oauth2, database
from app.repository import study_plans

router = APIRouter(tags=["Study Plans"],prefix="/study-plans")

@router.post("/",status_code=status.HTTP_201_CREATED,response_model=schemas.StudyPlanResponse)
def create_study_plan(request:schemas.StudyPlanGenerateRequest,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return study_plans.generate_and_save_study_plan(current_user.id,request.document_ids,db)

@router.get("/",status_code=status.HTTP_200_OK,response_model=List[schemas.StudyPlanResponse])
def get_study_plans(current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return study_plans.get_study_plans(current_user.id,db)

@router.get('/{study_plan_id}',status_code=status.HTTP_200_OK,response_model=schemas.StudyPlanResponse)
def get_study_plan(study_plan_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return study_plans.get_study_plan(study_plan_id,current_user.id,db)

@router.delete('/{study_plan_id}',status_code=status.HTTP_204_NO_CONTENT)
def delete_study_plan(study_plan_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return study_plans.delete_study_plan(study_plan_id,current_user.id,db)

@router.put('/{study_plan_id}/items/{item_id}',status_code=status.HTTP_200_OK,response_model=schemas.StudyPlanItemResponse)
def complete_item(request:schemas.StudyPlanItemUpdate,study_plan_id:int,study_plan_item_id:int,current_user:schemas.UserResponse=Depends(oauth2.get_current_user),db:Session=Depends(database.get_db)):
    return study_plans.update_item_completion(study_plan_id,study_plan_item_id,current_user.id,request.completed,db)