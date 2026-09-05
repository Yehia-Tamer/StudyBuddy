from google.api_core.exceptions import ResourceExhausted
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from app.rag.config import get_llm
from app.rag.key_rotation import API_KEYS, get_next_key
from app.rag.vectorstore import get_vectorstore
from pydantic import BaseModel

class CheatSheetLLM(BaseModel):
    title:str
    topic:str
    content:str

cheat_sheet_parser=JsonOutputParser(pydantic_object=CheatSheetLLM)

CHEAT_SHEET_PROMPT=PromptTemplate(
    template="""You are a study assistant. Generate a concise, well-organized cheat sheet based on the following document content.

The cheat sheet should cover the **most important concepts, definitions, formulas, rules, procedures, and key facts** from the documents provided. Prioritize information that is most likely to be useful for studying for a college-level exam. Generate a title for the cheat sheet and state the topic with repsect to the contents of the provided documents.

Requirements:

* Include concise explanations of important concepts.
* Include important definitions and terminology.
* Include formulas, equations, and calculation rules when applicable.
* Explain what each formula or rule is used for when necessary.
* Include important steps for processes, algorithms, or procedures.
* Highlight distinctions between concepts that could easily be confused.
* Include important examples or short worked examples when they improve understanding.
* Do not include unnecessary background information or repetition.
* Do not invent information that is not supported by the document.
* Keep the content concise and easy to scan during revision.
* Use bullet points, tables, and headings where appropriate.
* Preserve important technical terminology from the source material.
* The cheat sheet should be comprehensive enough to cover the major examinable concepts while remaining concise.

Document content:
{context}

{format_instructions}
""",
    input_variables=["context"],
    partial_variables={"format_instructions": cheat_sheet_parser.get_format_instructions()}
)

def generate_cheat_sheet(user_id:int,document_ids:list[int]):
    vectorstore=get_vectorstore()
    doc_filters=[{"document_id":doc_id } for doc_id in document_ids]

    where_filter={
        "$and":[
            {"user_id":user_id},
            {"$or":doc_filters} if len(doc_filters)>1 else doc_filters[0]
        ]
    }

    result=vectorstore.get(where=where_filter)
    documents=result.get("documents") or []
    context = '\n\n'.join(documents)

    if not documents:
        raise ValueError("No content found for this document")

    last_error=None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)

        try:
            chain=CHEAT_SHEET_PROMPT|llm|cheat_sheet_parser
            response=chain.invoke({"context":context})
            return response
        except ResourceExhausted as e:
            last_error=e
            continue

    raise last_error
