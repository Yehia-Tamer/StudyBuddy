import os
from datetime import timedelta

from app import models, hashing, JWTtoken
from starlette import status
from fastapi import HTTPException

def register(request,db):
    same_username = db.query(models.User).filter(models.User.username == request.username).first()
    if same_username:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    same_email = db.query(models.User).filter(models.User.email == request.email).first()
    if same_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = models.User(username=request.username, hashed_password=hashing.Hash.bcrypt(request.password),
                       email=request.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def login(request,db):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incorrect username or password")
    if not hashing.Hash.verify(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")))
    access_token = JWTtoken.create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}
