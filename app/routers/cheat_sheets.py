from typing import List

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from starlette import status

from app import schemas, oauth2, database
from app.repository import cheat_sheets

router = APIRouter(tags=["Cheat Sheets"], prefix="/cheat_sheets")


@router.get(
    "/{cheat_sheet_id}",
    status_code=status.HTTP_200_OK,
    response_model=schemas.CheatSheetResponse,
)
def get_cheat_sheet(
    cheat_sheet_id: int,
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user),
    db: Session = Depends(database.get_db),
):
    return cheat_sheets.get_cheat_sheet(cheat_sheet_id, current_user.id, db)


@router.get(
    "/", status_code=status.HTTP_200_OK, response_model=List[schemas.CheatSheetResponse]
)
def get_cheat_sheets(
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user),
    db: Session = Depends(database.get_db),
):
    return cheat_sheets.get_cheat_sheets(current_user.id, db)


@router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=schemas.CheatSheetResponse
)
def generate_cheat_sheet(
    request: schemas.CheatSheetGenerateRequest,
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user),
    db: Session = Depends(database.get_db),
):
    return cheat_sheets.generate_and_save_cheat_sheet(
        current_user.id, request.document_ids, db
    )


@router.delete("/{cheat_sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cheat_sheet(
    cheat_sheet_id: int,
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user),
    db: Session = Depends(database.get_db),
):
    cheat_sheets.delete_cheat_sheet(cheat_sheet_id, current_user.id, db)
