from google.api_core.exceptions import ResourceExhausted
from langchain_classic.retrievers import (
    MultiQueryRetriever,
    EnsembleRetriever,
    ContextualCompressionRetriever,
)
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_community.retrievers import BM25Retriever

from app.rag.key_rotation import MULTI_RETRIEVER_KEYS, get_next_multi_retriever_key


def build_multi_query_retriever(base_retriever, llm_function):
    last_error = None
    for _ in range(len(MULTI_RETRIEVER_KEYS)):
        key = get_next_multi_retriever_key()
        try:
            llm = llm_function(key)
            return MultiQueryRetriever.from_llm(retriever=base_retriever, llm=llm)
        except ResourceExhausted as e:
            last_error = e
            continue

    raise last_error


def build_hybrid_retriever(
    vectorstore, user_id: int, document_id: int, get_llm_fn, k: int = 8
):
    base_vector_retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": k,
            "filter": {"$and": [{"user_id": user_id}, {"document_id": document_id}]},
        }
    )

    vector_retriever = build_multi_query_retriever(base_vector_retriever, get_llm_fn)

    filtered = vectorstore.get(
        where={"$and": [{"document_id": document_id}, {"user_id": user_id}]}
    )

    chunks = filtered["documents"]

    if not chunks:
        return vector_retriever

    bm25_retriever = BM25Retriever.from_texts(chunks)
    bm25_retriever.k = k

    hybrid_retriever = EnsembleRetriever(
        retrievers=[vector_retriever, bm25_retriever], weights=[0.5, 0.5]
    )

    return hybrid_retriever


_reranker = None


def get_reranker(top_n: int = 5):
    global _reranker
    if _reranker is None:
        cross_encoder = HuggingFaceCrossEncoder(
            model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"
        )

        _reranker = CrossEncoderReranker(model=cross_encoder, top_n=top_n)

    return _reranker


def build_reranking_retriever(hybrid_retriever, top_n: int = 5):
    reranker = get_reranker(top_n=top_n)

    return ContextualCompressionRetriever(
        base_compressor=reranker, base_retriever=hybrid_retriever
    )
