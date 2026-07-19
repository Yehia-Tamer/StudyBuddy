from langchain_core.output_parsers import JsonOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from google.api_core.exceptions import ResourceExhausted
import tiktoken
from pydantic import BaseModel, Field

from app.rag.key_rotation import API_KEYS, get_next_key
from app.rag.vectorstore import get_vectorstore

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


PROMPT = PromptTemplate(
    template="""You are a helpful study assistant. Use the context below from the user's document to answer their question. Use the conversation history to understand follow-up questions.

Context from document:
{context}

Conversation history:
{history}

Current question: {question}

Answer:""",
    input_variables=["context", "history", "question"]
)


def build_chain(llm, retriever):
    return (
        {
            "context": (lambda x: x["question"]) | retriever | format_docs,
            "history": lambda x: x["history"],
            "question": lambda x: x["question"],
        }
        | PROMPT
        | llm
    )

def extract_text(response) -> str:
    content = response.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        # Content blocks — pull out the text parts
        text_parts = [
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        return "".join(text_parts)
    return str(content)  # fallback, just in case

def ask_question_with_fallback(question: str, user_id: int, document_id: int, history=None):
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(
        search_kwargs={
            "filter": {
                "$and": [
                    {"user_id": user_id},
                    {"document_id": document_id}
                ]
            }
        }
    )

    history_text = format_history(history, max_tokens=2000)

    last_error = None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)
        try:
            chain = build_chain(llm, retriever)
            response = chain.invoke({"question": question, "history": history_text})
            return extract_text(response)
        except ResourceExhausted as e:
            last_error = e
            continue

    raise last_error

class FlashCardItem(BaseModel):
    question:str=Field(description="A question testing the understanding of the material")
    answer:str=Field(description="The answer to the question")

class FlashCardSet(BaseModel):
    flashcards:list[FlashCardItem]=Field(description="A list of generated flashcard items testing the understanding of the material")


flashcard_parser=JsonOutputParser(pydantic_object=FlashCardSet)

FLASHCARD_PROMPT = PromptTemplate(
    template="""You are a study assistant. Generate {count} flashcards based on the following document content. Each flashcard should have a clear question and a concise, accurate answer. Cover the most important concepts.

Document content:
{context}

{format_instructions}
""",
    input_variables=["context", "count"],
    partial_variables={"format_instructions": flashcard_parser.get_format_instructions()}
)

def generate_flashcards(user_id: int, document_id: int, count: int = 10):
    vectorstore = get_vectorstore()
    result = vectorstore.get(where={"$and": [{"user_id": user_id}, {"document_id": document_id}]})
    documents = result.get("documents") or []
    context = "\n\n".join(documents)

    if not context:
        raise ValueError("No content found for this document")

    last_error = None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)

        try:
            chain = FLASHCARD_PROMPT | llm | flashcard_parser
            response = chain.invoke({"context": context, "count": count})
            return response["flashcards"]
        except ResourceExhausted as e:
            last_error = e
            continue

    raise last_error
