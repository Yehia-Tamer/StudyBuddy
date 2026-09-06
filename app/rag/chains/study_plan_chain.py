from google.api_core.exceptions import ResourceExhausted
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

from app.rag.config import get_llm
from app.rag.key_rotation import API_KEYS, get_next_key
from app.rag.vectorstore import get_vectorstore


class StudyPlanItemLLM(BaseModel):
    topic: str = Field(
        description="A specific topic or concept the student should study"
    )
    priority: str = Field(
        description="The priority level of the material, 'high'/'medium'/'low'"
    )
    estimated_time: int = Field(description="The estimated time for the material")
    subtopics: list[str] = Field(
        description="The subtopics associated with the material to focus on"
    )


class StudyPlanLLM(BaseModel):
    title: str = Field(description="The title for the study plan.")
    items: list[StudyPlanItemLLM] = Field(
        description="An ordered list of study plan items, most important first"
    )


study_plan_parser = JsonOutputParser(pydantic_object=StudyPlanLLM)

STUDY_PLAN_PROMPT = PromptTemplate(
    template="""You are a study assistant. Based on the following document content, create a personalized study plan. Break the material into distinct topics, assign each a priority based on complexity/importance, priority should ne high/medium/low only, estimate study time in minutes, and list specific subtopics or questions to focus on for each.
Also, generate a title for the study plan based on the document provided.

Document content:
{context}

{format_instructions}
""",
    input_variables=["context"],
    partial_variables={
        "format_instructions": study_plan_parser.get_format_instructions()
    },
)


def generate_study_plan(user_id: int, document_ids: list[int]):
    vectorstore = get_vectorstore()

    doc_filters = [{"document_id": doc_id} for doc_id in document_ids]

    where_filter = {
        "$and": [
            {"user_id": user_id},
            {"$or": doc_filters} if len(doc_filters) > 1 else doc_filters[0],
        ]
    }

    result = vectorstore.get(where=where_filter)

    documents = result.get("documents") or []

    context = "\n\n".join(documents)

    if not context:
        error = (
            ValueError("No content found for the given document")
            if len(doc_filters) == 1
            else ValueError("No content found for the given documents")
        )
        raise error

    last_error = None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)
        try:
            chain = STUDY_PLAN_PROMPT | llm | study_plan_parser
            response = chain.invoke({"context": context})
            return response
        except ResourceExhausted as e:
            last_error = e
            continue
    raise last_error
