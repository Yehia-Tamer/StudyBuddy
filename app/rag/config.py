
from langchain_google_genai import ChatGoogleGenerativeAI
import tiktoken


_encoding = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_encoding.encode(text))


def get_llm(api_key: str):
    return ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview",
        google_api_key=api_key,
        temperature=0.2
    )


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