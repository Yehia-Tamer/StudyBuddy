import os
from itertools import cycle

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

EMBEDDING_KEYS = [k for k in [
    os.getenv("EMBEDDING_KEY_1"),
    os.getenv("EMBEDDING_KEY_2"),
    os.getenv("EMBEDDING_KEY_3"),
] if k]

_embedding_key_cycle=cycle(EMBEDDING_KEYS)

def get_next_embedding_key():
    return next(_embedding_key_cycle)
