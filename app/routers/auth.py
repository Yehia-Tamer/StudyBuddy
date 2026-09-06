from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette import status

from app import schemas, database
from app.repository import auth

router = APIRouter(tags=["authentication"], prefix="/auth")


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.UserResponse,
)
def register(request: schemas.UserCreate, db: Session = Depends(database.get_db)):
    return auth.register(request, db)


@router.post("/login", status_code=status.HTTP_201_CREATED)
def login(
    request: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    return auth.login(request, db)
