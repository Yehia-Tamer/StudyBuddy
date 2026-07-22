from google.api_core.exceptions import ResourceExhausted
from langchain_core.prompts import PromptTemplate
from app.rag.config import format_docs, format_history, get_llm
from app.rag.key_rotation import API_KEYS, get_next_key
from app.rag.vectorstore import get_vectorstore

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