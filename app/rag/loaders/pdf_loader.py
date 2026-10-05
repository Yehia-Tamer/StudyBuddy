import os

import pytesseract
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from pdf2image import convert_from_path

# OCR binaries. On Linux/Docker, tesseract and poppler are installed system-wide
# (see Dockerfile) and found on PATH, so no paths are needed. On Windows they live
# in custom folders: override with TESSERACT_CMD / POPPLER_PATH env vars, otherwise
# the defaults below are used.
_ON_WINDOWS = os.name == "nt"
TESSERACT_CMD = os.getenv("TESSERACT_CMD") or (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe" if _ON_WINDOWS else None
)
POPPLER_PATH = os.getenv("POPPLER_PATH") or (
    r"C:\poppler-26.02.0\Library\bin" if _ON_WINDOWS else None  # None = use PATH
)
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


class PDFLoadError(Exception):
    pass


def ocr_pdf(file_path: str) -> list[Document]:
    images = convert_from_path(file_path, poppler_path=POPPLER_PATH)
    documents = []
    for i, img in enumerate(images):
        text = pytesseract.image_to_string(img, lang="eng")
        documents.append(
            Document(page_content=text, metadata={"source": file_path, "page": i})
        )
    return documents


def load_and_split_pdf(file_path: str):
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800, chunk_overlap=150, separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = splitter.split_documents(documents)

    if len(chunks) == 0:
        documents = ocr_pdf(file_path)
        chunks = splitter.split_documents(documents)

    if len(chunks) == 0:
        raise PDFLoadError("No extractable text found in document")

    return chunks
