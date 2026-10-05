import logging

from google.genai import errors as genai_errors
from langchain_core.callbacks import BaseCallbackHandler
from langchain_google_genai import ChatGoogleGenerativeAI
import tiktoken

logger = logging.getLogger(__name__)

_encoding = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_encoding.encode(text))


# Tried in order. Each fallback is a DIFFERENT model: overload is per model,
# so retrying the same overloaded model doesn't help.
# Chosen from a live test on the server (2026-10-05): quality first, availability last.
# Avoid "-latest" aliases: they can silently switch to a different model.
LLM_MODELS = [
    "gemini-3.8-flash",       # best quality
    "gemini-3.6-flash",       # different model, fast
    "gemini-3.5-flash-lite",  # lite: lighter model, more spare capacity
    "gemini-3.1-flash-lite",  # older-generation lite, final safety net
]

# Errors that make us move on to the next model. APIError is the base class of the
# new google.genai SDK's ClientError (4xx, e.g. 429 rate limit / 404 unknown model)
# and ServerError (5xx, e.g. 503 "model is experiencing high demand").
FALLBACK_EXCEPTIONS = (genai_errors.APIError,)


class _ModelFailureLogger(BaseCallbackHandler):
    """Logs which model failed, so fallbacks are visible in `docker compose logs`."""

    def __init__(self, model: str):
        self.model = model

    def on_llm_error(self, error: BaseException, **kwargs) -> None:
        logger.warning("LLM model %s failed (%s); falling back if another model is left", self.model, error)


def _make_model(model: str, api_key: str, is_last: bool) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key,
        temperature=0.2,
        # Fail fast on all but the last model so the fallback kicks in quickly
        # (default is 6 attempts). Note: 1 = no retries; 0 would mean "SDK default".
        max_retries=3 if is_last else 2,
        callbacks=[_ModelFailureLogger(model)],
    )


def get_llm(api_key: str, tools: list | None = None):
    """Return the primary Gemini model with automatic fallback to the others.

    If `tools` are given, they are bound to EACH model before adding fallbacks,
    because the fallback wrapper (RunnableWithFallbacks) has no `.bind_tools()`.
    """
    models = [
        _make_model(name, api_key, is_last=(i == len(LLM_MODELS) - 1))
        for i, name in enumerate(LLM_MODELS)
    ]
    if tools:
        models = [m.bind_tools(tools) for m in models]

    primary, *fallbacks = models
    return primary.with_fallbacks(fallbacks, exceptions_to_handle=FALLBACK_EXCEPTIONS)


def format_docs(docs) -> str:
    return "\n\n".join(doc.page_content for doc in docs)


def format_history(messages, max_tokens: int = 2000) -> str:
    if not messages:
        return "No previous conversation."

    selected = []
    total_tokens = 0

    for message in reversed(messages):
        role = "User" if message.role == "user" else "Assistant"
        line = f"{role}: {message.content}"
        tokens = count_tokens(line)

        if total_tokens + tokens > max_tokens:
            break

        selected.insert(0, line)
        total_tokens += tokens

    if not selected:
        return "No previous conversation."

    return "\n".join(selected)
