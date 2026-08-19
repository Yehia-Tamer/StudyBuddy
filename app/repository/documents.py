import os
import shutil

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from starlette import status

from app import models
from app.rag import vectorstore
from app.rag.loaders import pdf_loader
from app.rag.loaders.youtube_loader import get_video_id, load_youtube_document, YoutubeTranscriptError
from app.rag.loaders.web_loader import load_web_document,WebArticleError
from app.rag.vectorstore import get_vectorstore, add_documents

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
        chunks=pdf_loader.load_and_split(file_path)
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
        add_documents(chunks,user_id=user_id,document_id=new_document.id)
    except Exception as e:
        db.delete(new_document)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to embed document: {str(e)}")

    return new_document

def create_youtube_document(url:str,user_id:int,db:Session) -> models.Document:
    video_id=get_video_id(url)
    if not video_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a valid YouTube URL")
    try:
        chunks=load_youtube_document(url)
    except YoutubeTranscriptError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=f"Failed to process YouTube Video: {e}")

    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="No transcript found from this YouTube video")

    new_document = models.Document(
        user_id=user_id,
        filename=f"YouTube: {video_id}",
        page_count=None,
        source_type="youtube",
        source_url=url
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    try:
        add_documents(chunks,user_id=user_id,document_id=new_document.id)
    except Exception as e:
        db.delete(new_document)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to embed document: {str(e)}")

    return new_document

def create_web_document(url:str,user_id:int,db:Session)->models.Document:
    try:
        chunks=load_web_document(url)
    except WebArticleError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))

    title=chunks[0].metadata.get('title',url)

    document=models.Document(
        filename=title,
        source_type='web',
        source_url=url,
        user_id=user_id,
        page_count=None
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    for chunk in chunks:
        chunk.metadata['user_id']=user_id
        chunk.metadata['document_id']=document.id

    try:
        vectorstore=get_vectorstore()
        vectorstore.add_documents(chunks)
    except Exception as e:
        db.delete(document)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=f"Failed to embed document: {e}")

    return document

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

