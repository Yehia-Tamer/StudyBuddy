from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from starlette import status
from app import database

from app import JWTtoken

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token:str=Depends(oauth2_scheme),db:Session=Depends(database.get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",headers={"WWW-Authenticate":"Bearer"})
    return JWTtoken.verify_token(token,credentials_exception,db)
