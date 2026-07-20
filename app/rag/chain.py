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
    type:str=Field(description="The type of question either Q&A or True/False")
    question:str=Field(description="A question testing the understanding of the material")
    answer:str=Field(description="The answer to the question")

class FlashCardSet(BaseModel):
    flashcards:list[FlashCardItem]=Field(description="A list of generated flashcard items testing the understanding of the material")


flashcard_parser=JsonOutputParser(pydantic_object=FlashCardSet)

FLASHCARD_PROMPT = PromptTemplate(
    template="""You are a study assistant. Generate {count} flashcards based on the following document content. Use a mix of two types:
- 'qa': a question with a concise, accurate answer
- 'true_false': a statement the student must judge as True or False (answer must be exactly "True" or "False")

Cover the most important concepts.

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

class StudyPlanItemLLM(BaseModel):
    topic:str=Field(description="A specific topic or concept the student should study")
    priority:str=Field(description="The priority level of the material, 'high'/'medium'/'low'")
    estimated_time:int=Field(description="The estimated time for the material")
    subtopics:list[str]=Field(description="The subtopics associated with the material to focus on")

class StudyPlanLLM(BaseModel):
    items:list[StudyPlanItemLLM]=Field(description="An ordered list of study plan items, most important first")

study_plan_parser=JsonOutputParser(pydantic_object=StudyPlanLLM)

STUDY_PLAN_PROMPT = PromptTemplate(template="""You are a study assistant. Based on the following document content, create a personalized study plan. Break the material into distinct topics, assign each a priority based on complexity/importance, priority should ne high/medium/low only, estimate study time in minutes, and list specific subtopics or questions to focus on for each.

Document content:
{context}

{format_instructions}
""",
    input_variables=["context"],
    partial_variables={"format_instructions": study_plan_parser.get_format_instructions()}
)

def generate_study_plan(user_id: int, document_ids: list[int]):
    vectorstore = get_vectorstore()

    doc_filters=[{"document_id":doc_id} for doc_id in document_ids]

    where_filter={
        "$and":[
            {"user_id":user_id},
            {"$or":doc_filters} if len(doc_filters) > 1 else doc_filters[0]
        ]
    }

    result=vectorstore.get(where=where_filter)

    documents = result.get("documents") or []

    context = "\n\n".join(documents)

    if not context:
        error=ValueError("No content found for the given document") if len(doc_filters) == 1 else ValueError("No content found for the given documents")
        raise error

    last_error = None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)
        try:
            chain=STUDY_PLAN_PROMPT | llm | study_plan_parser
            response = chain.invoke({"context": context})
            return response["items"]
        except ResourceExhausted as e:
            last_error=e
            continue
    raise last_error

class GradeResult(BaseModel):
    correct:bool
    feedback:str

grade_parser=JsonOutputParser(pydantic_object=GradeResult)

GRADE_PROMPT = PromptTemplate(
    template="""You are grading a student's flashcard answer. Compare the student's answer to the correct answer. Accept answers that are semantically similar or convey the same meaning, even if worded differently. Be reasonably lenient — minor phrasing differences should still count as correct if the core idea matches.

Question: {question}
Correct answer: {correct_answer}
Student's answer: {user_answer}

{format_instructions}
""",
    input_variables=["question", "correct_answer", "user_answer"],
    partial_variables={"format_instructions": grade_parser.get_format_instructions()}
)

def grade_flashcard_answer(question:str, correct_answer:str, user_answer:str):
    last_error=None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)

        try:
            chain=GRADE_PROMPT|llm|grade_parser
            response=chain.invoke({"question":question, "correct_answer":correct_answer, "user_answer":user_answer})
            return response
        except ResourceExhausted as e:
            last_error=e
            continue

    raise last_error