from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from app import models
from app.rag.chains import cheat_sheet_chain

def generate_and_save_cheat_sheet(user_id:int,document_ids:list[int],db:Session):
    documents=db.query(models.Document).filter(models.Document.id.in_(document_ids)).all()
    if len(documents)!=len(document_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="One or more documents not found")
    
    for document in documents:
        if document.user_id!=user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized")

    response=cheat_sheet_chain.generate_cheat_sheet(user_id,document_ids)

    cheat_sheet=models.CheatSheet(
        user_id=user_id,
        title=response["title"],
        topic=response["topic"],
        content=response["content"],
        documents=documents
    )

    db.add(cheat_sheet)
    db.commit()
    db.refresh(cheat_sheet)

    return cheat_sheet

def get_cheat_sheet(cheat_sheet_id:int,user_id:int,db:Session):
    cheat_sheet=db.query(models.CheatSheet).filter(models.CheatSheet.id==cheat_sheet_id).first()
    if not cheat_sheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Cheat sheet not found")

    if cheat_sheet.user_id!=user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="User not authorized")

    return cheat_sheet

def get_cheat_sheets(user_id:int,db:Session):
    return db.query(models.CheatSheet).filter(models.CheatSheet.user_id==user_id).all()

def delete_cheat_sheet(cheat_sheet_id:int,user_id:int,db:Session):
    cheat_sheet=get_cheat_sheet(cheat_sheet_id,user_id,db)

    db.delete(cheat_sheet)
    db.commit()