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