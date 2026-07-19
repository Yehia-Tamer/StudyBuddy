from fastapi import FastAPI
from app.routers import auth,documents,chat
from app import models,database

api=FastAPI()
models.Base.metadata.create_all(bind=database.engine)
@api.get("/", status_code=200)
def root():
    return {"message": "Study Buddy !!"}

api.include_router(auth.router)
api.include_router(documents.router)
api.include_router(chat.router)