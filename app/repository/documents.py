import os
import shutil

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from starlette import status

from app import models
from app.rag import loader, vectorstore
from app.rag.vectorstore import get_vectorstore

UPLOAD_DIR = "uploads"

def save_uploaded_file(file:UploadFile,user_id:int) -> str:
    """Save the uploaded file to disk under a per-user folder, return the file path."""
    user_dir= os.path.join(UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    file_path=os.path.join(user_dir,file.filename)
    with open(file_path,"wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path

def create_document(file:UploadFile,user_id:int,db:Session) -> models.Document:
    """
       Full pipeline: save file -> load & split into chunks -> embed & store in Chroma
       -> save Document record in Postgres.
    """

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Not a PDF file")

    file_path=save_uploaded_file(file,user_id)

    try:
        chunks=loader.load_and_split(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    if not chunks:
        raise HTTPException(status_code=400, detail="No extractable text found in PDF")

    new_document = models.Document(
        user_id=user_id,
        filename=file.filename,
        page_count=len(set(chunk.metadata.get("page", 0) for chunk in chunks))
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    try:
        vectorstore.add_documents(chunks,user_id=user_id,document_id=new_document.id)
    except Exception as e:
        db.delete(new_document)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to embed document: {str(e)}")

    return new_document

def get_user_documents(user_id:int,db:Session):
    return db.query(models.Document).filter(models.Document.user_id == user_id).all()

def delete_document(document_id: int, user_id: int, db: Session):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized")

    vectorstore = get_vectorstore()
    vectorstore.delete(where={"$and": [{"user_id": user_id}, {"document_id": document_id}]})

    db.delete(document)
    db.commit()

