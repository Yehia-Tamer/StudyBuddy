import os
from itertools import cycle

from google.api_core.exceptions import ResourceExhausted
from langchain_classic.retrievers import MultiQueryRetriever

API_KEYS = [
    os.getenv("GOOGLE_API_KEY_1"),
    os.getenv("GOOGLE_API_KEY_2"),
    os.getenv("GOOGLE_API_KEY_3"),
]

_key_cycle = cycle(API_KEYS)

def get_next_key():
    return next(_key_cycle)

MULTI_RETRIEVER_KEYS=[
    os.getenv("MULTI_RETRIEVER_KEY_1"),
    os.getenv("MULTI_RETRIEVER_KEY_2"),
    os.getenv("MULTI_RETRIEVER_KEY_3"),
]

_multi_retriever_key_cycle=cycle(MULTI_RETRIEVER_KEYS)

def get_next_multi_retriever_key():
    return next(_multi_retriever_key_cycle)

def build_multi_query_retriever(base_retriever,llm_function):
    last_error=None
    for _ in range(len(MULTI_RETRIEVER_KEYS)):
        key=get_next_multi_retriever_key()
        try:
            llm=llm_function(key)
            return MultiQueryRetriever.from_llm(retriever=base_retriever,llm=llm)
        except ResourceExhausted as e:
            last_error=e
            continue

    raise last_error



