import os
import shutil
import tempfile

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from starlette import status

from app import models
from app.rag import vectorstore
from app.rag.loaders.pdf_loader import load_and_split_pdf,PDFLoadError
from app.rag.loaders.youtube_loader import get_video_id, load_youtube_document, YoutubeTranscriptError
from app.rag.loaders.web_loader import load_web_document, WebArticleError
from app.rag.loaders.audio_loader import AudioTranscriptError, load_audio_document
from app.rag.loaders.pptx_loader import load_and_split_pptx,PPTXLoadError
from app.rag.vectorstore import get_vectorstore, add_documents

UPLOAD_DIR = "uploads"

def save_uploaded_file(file: UploadFile, user_id: int) -> str:
    """Save the uploaded file to disk under a per-user folder, return the file path."""
    user_dir = os.path.join(UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    file_path = os.path.join(user_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path

def create_pdf_document(file: UploadFile, user_id: int, db: Session) -> models.Document:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a PDF file")

    file_path = save_uploaded_file(file, user_id)

    try:
        chunks = load_and_split_pdf(file_path)
    except PDFLoadError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process PDF file: {e}")

    new_document = models.Document(
        user_id=user_id,
        filename=file.filename,
        source_type="pdf",
        page_count=len(chunks)
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    try:
        add_documents(chunks, user_id=user_id, document_id=new_document.id)
    except Exception as e:
        db.delete(new_document)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to embed document: {str(e)}")

    return new_document

def create_youtube_document(url: str, user_id: int, db: Session) -> models.Document:
    video_id = get_video_id(url)
    if not video_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a valid YouTube URL")
    try:
        chunks = load_youtube_document(url)
    except YoutubeTranscriptError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process YouTube Video: {e}")

    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No transcript found from this YouTube video")

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
        add_documents(chunks, user_id=user_id, document_id=new_document.id)
    except Exception as e:
        db.delete(new_document)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to embed document: {str(e)}")

    return new_document

def create_web_document(url: str, user_id: int, db: Session) -> models.Document:
    try:
        chunks = load_web_document(url)
    except WebArticleError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process URL: {e}")

    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No content extracted from this URL")

    title = chunks[0].metadata.get('title', url)

    document = models.Document(
        filename=title,
        source_type='web',
        source_url=url,
        user_id=user_id,
        page_count=None
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        add_documents(chunks, user_id=user_id, document_id=document.id)
    except Exception as e:
        db.delete(document)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to embed document: {e}")

    return document

def create_audio_document(file: UploadFile, user_id: int, db: Session) -> models.Document:
    suffix = os.path.splitext(file.filename)[1] or ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name

    try:
        try:
            chunks = load_audio_document(tmp_path, file.filename)
        except AudioTranscriptError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process audio file: {e}")

        if not chunks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No speech detected in audio file")

        document = models.Document(
            filename=file.filename,
            source_type="audio",
            source_url=None,
            user_id=user_id,
            page_count=None
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        try:
            add_documents(chunks, user_id=user_id, document_id=document.id)
        except Exception as e:
            db.delete(document)
            db.commit()

            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to embed document: {e}")

        return document

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def create_pptx_document(file:UploadFile,user_id:int,db:Session):
    if not file.filename.lower().endswith(('.pptx','.ppt')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Not a PowerPoint File")
    file_path=save_uploaded_file(file,user_id)

    try:
        chunks=load_and_split_pptx(file_path)
    except PPTXLoadError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process PowerPoint file: {e}")

    new_document=models.Document(
        user_id=user_id,
        filename=file.filename,
        source_type='pptx',
        page_count=len(set(chunk.metadata.get("slide",0) for chunk in chunks))
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    try:
        add_documents(chunks,user_id=user_id,document_id=new_document.id)
    except Exception as e:
        db.delete(new_document)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=f"Failed to embed document: {e}")

    return new_document


def get_user_documents(user_id: int, db: Session):
    return db.query(models.Document).filter(models.Document.user_id == user_id).all()

def get_document(document_id:int,user_id:int,db:Session):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized")

    return document

def delete_document(document_id: int, user_id: int, db: Session):
    document=get_document(document_id,user_id,db)
    vectorstore = get_vectorstore()
    vectorstore.delete(where={"$and": [{"user_id": user_id}, {"document_id": document_id}]})

    db.delete(document)
    db.commit()