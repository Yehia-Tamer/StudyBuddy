from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    chat,
    cheat_sheets,
    documents,
    flashcards,
    quizzes,
    study_plans,
)

api = FastAPI()

api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@api.get("/", status_code=200)
def root():
    return {"message": "Study Buddy !!"}


api.include_router(auth.router)
api.include_router(documents.router)
api.include_router(chat.router)
api.include_router(study_plans.router)
api.include_router(quizzes.router)
api.include_router(cheat_sheets.router)
api.include_router(flashcards.router)
