import pytesseract
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from pdf2image import convert_from_path

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
POPPLER_PATH = r"C:\poppler-26.02.0\Library\bin"

def ocr_pdf(file_path:str)->list[Document]:
    images=convert_from_path(file_path,poppler_path=POPPLER_PATH)
    documents=[]
    for i,img in enumerate(images):
        text=pytesseract.image_to_string(img,lang="eng")
        documents.append(
            Document(page_content=text,metadata={"source":file_path,"page":i})
        )
    return documents

def load_and_split(file_path:str):
    loader=PyPDFLoader(file_path)
    documents=loader.load()
    splitter=RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = splitter.split_documents(documents)

    if len(chunks)==0:
        documents=ocr_pdf(file_path)
        chunks=splitter.split_documents(documents)

    return chunks