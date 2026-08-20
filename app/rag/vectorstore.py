from langchain_chroma import Chroma
from google.api_core.exceptions import ResourceExhausted
from app.rag import embeddings
from app.rag.key_rotation import EMBEDDING_KEYS, get_next_embedding_key


def get_vectorstore():
    return Chroma(
        persist_directory="./chroma.db",
        embedding_function=embeddings.get_local_embeddings()
    )


def add_documents(chunks, user_id: int, document_id: int):
    for chunk in chunks:
        chunk.metadata["user_id"] = user_id
        chunk.metadata["document_id"] = document_id

    vectorstore=get_vectorstore()
    vectorstore.add_documents(chunks)
    return vectorstore