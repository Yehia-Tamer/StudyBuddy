import os
from langchain_huggingface import HuggingFaceEmbeddings

from langchain_google_genai import GoogleGenerativeAIEmbeddings

_local_embeddings=None

def get_local_embeddings():
    global _local_embeddings

    if _local_embeddings is None:
        _local_embeddings=HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    return _local_embeddings

def get_embeddings(api_key:str | None = None):  #standby
    return GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key or os.getenv("EMBEDDING_KEY_1")
    )