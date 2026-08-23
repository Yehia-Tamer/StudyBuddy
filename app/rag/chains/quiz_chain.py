from google.api_core.exceptions import ResourceExhausted
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from app.rag.config import get_llm
from app.rag.key_rotation import API_KEYS, get_next_key
from app.rag.vectorstore import get_vectorstore
from pydantic import BaseModel,Field

class QuizQuestionLLM(BaseModel):
    type: str = Field(description="The type of question either Q&A or True/False")
    question: str = Field(description="A question testing the understanding of the material")
    answer: str = Field(description="The answer to the question")

class QuizLLM(BaseModel):
    topic:str = Field(description="The topic of the quiz")
    questions: list[QuizQuestionLLM] = Field(description="The questions testing the understanding of the material")
    time_estimate_minutes:int = Field(description="An estimate of how long the entire quiz should last")

quiz_parser=JsonOutputParser(pydantic_object=QuizLLM)

QUIZ_PROMPT=PromptTemplate(
    template="""You are a study assistant. Generate {count} exam style questions based on the following document content. Questions should be similar to those of college levels and should be {difficulty}, and you must state the topic of the quiz and how long the quiz should take based on the difficulty and the number of questions in whole minutes. Use a mix of two types:
- 'qa': a question with a concise, accurate answer, could be either theoretical or a question involving calculations
- 'true_false': a statement the student must judge as True or False (answer must be exactly "True" or "False")

Cover the most important concepts.

Document content:
{context}

{format_instructions}
""",
    input_variables=["context", "count","difficulty"],
    partial_variables={"format_instructions": quiz_parser.get_format_instructions()}
)

def generate_quiz(user_id:int,document_ids:list[int],difficulty:str,count:int=10):
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
    context="\n\n".join(documents)

    if not context:
        raise ValueError("No content found for this document")

    last_error=None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)

        try:
            chain = QUIZ_PROMPT | llm | quiz_parser
            response = chain.invoke({"context": context, "count": count,"difficulty": difficulty})
            return response["questions"],response["topic"],response["time_estimate_minutes"]
        except ResourceExhausted as e:
            last_error = e
            continue

    raise last_error

class QuestionResult(BaseModel):
    correct:bool
    correct_answer:str
    feedback:str

grade_parser=JsonOutputParser(pydantic_object=QuestionResult)

QUESTION_GRADE_PROMPT = PromptTemplate(
    template="""You are grading a student's answer of a question in a quiz. Grade like you are a college professor. Compare the student's answer to the correct answer. Accept answers that are semantically similar or convey the same meaning, even if worded differently. Be reasonably lenient — minor phrasing differences should still count as correct if the core idea matches.

IMPORTANT: Your response must be valid JSON. Do NOT use LaTeX notation or backslash escape sequences (e.g., do not write \\omega, \\pi, \\alpha). Write mathematical symbols using plain Unicode characters instead (e.g., ω, π, α, ², ₀) with no backslashes.

Question: {question}
Correct answer: {correct_answer}
Student's answer: {user_answer}

{format_instructions}
""",
    input_variables=["question", "correct_answer", "user_answer"],
    partial_variables={"format_instructions": grade_parser.get_format_instructions()}
)

def grade_question(question:str, correct_answer:str, user_answer:str):
    last_error=None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)

        try:
            chain=QUESTION_GRADE_PROMPT|llm|grade_parser
            response=chain.invoke({"question":question, "correct_answer":correct_answer, "user_answer":user_answer})
            return response
        except ResourceExhausted as e:
            last_error=e
            continue

    raise last_error

def grade_quiz(questions:list[str],correct_answers:list[str],user_answers:list[str]):
    results=[]
    score=0
    for question,correct_answer,user_answer in zip(questions,correct_answers,user_answers):
        result=grade_question(question,correct_answer,user_answer)
        if result["correct"]:
            score+=1
        results.append(result)
    return score,results
