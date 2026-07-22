import json

from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from app import models
from app.rag.chains import study_plan_chain


def generate_and_save_study_plan(user_id:int,document_ids:list[int],db:Session):
    documents=db.query(models.Document).filter(models.Document.id.in_(document_ids)).all()
    if len(documents)!=len(document_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="One or more documents not found")

    for document in documents:
        if document.user_id!=user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    generated_items=study_plan_chain.generate_study_plan(user_id,document_ids)

    study_plan=models.StudyPlan(user_id=user_id)
    db.add(study_plan)
    db.commit()
    db.refresh(study_plan)

    saved_items=[]

    for item in generated_items:
        plan_item=models.StudyPlanItem(
            study_plan_id=study_plan.id,
            topic=item["topic"],
            priority=item["priority"],
            estimated_time=item["estimated_time"],
            subtopics=json.dumps(item["subtopics"])
        )
        db.add(plan_item)
        saved_items.append(plan_item)

    db.commit()

    for item in saved_items:
        db.refresh(item)

    study_plan.items=saved_items

    return study_plan

def get_study_plans(user_id:int,db:Session):
    return db.query(models.StudyPlan).filter(models.StudyPlan.user_id==user_id).all()

def get_study_plan(study_plan_id:int,user_id:int,db:Session):
    study_plan=db.query(models.StudyPlan).filter(models.StudyPlan.id==study_plan_id).first()
    if not study_plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Study plan not found")

    if study_plan.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    return study_plan

def delete_study_plan(study_plan_id:int,user_id:int,db:Session):
    study_plan=db.query(models.StudyPlan).filter(models.StudyPlan.id==study_plan_id).first()

    if not study_plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Study plan not found")

    if study_plan.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    db.delete(study_plan)
    db.commit()

def update_item_completion(study_plan_id:int,item_id:int,user_id:int,completed:bool,db:Session):
    study_plan=get_study_plan(study_plan_id,user_id,db)
    for item in study_plan.items:
        if item.id==item_id:
            item.completed = completed

            db.commit()
            db.refresh(item)

            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Item not found")

