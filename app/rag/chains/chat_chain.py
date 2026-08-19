
from google.api_core.exceptions import ResourceExhausted
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from langchain_core.prompts import PromptTemplate
from app.rag.config import format_docs, format_history, get_llm
from app.rag.key_rotation import API_KEYS, get_next_key
from app.rag.retrievers import build_hybrid_retriever, build_reranking_retriever
from app.rag.vectorstore import get_vectorstore
from app.rag.tools import get_web_search_tool
from langchain_core.documents import Document
import os


def build_sources(docs:list[Document])->list[dict]:
    seen=set()
    sources=[]

    for doc in docs:
        meta=doc.metadata
        source_type=meta.get("source_type","pdf")

        if source_type == 'youtube':
            key=("youtube",meta.get("source_url"),meta.get("timestamp_seconds"))
            if key in seen:
                continue

            seen.add(key)
            seconds=round(meta.get("timestamp_seconds"))
            source_url = meta.get("source_url")
            sources.append({
                "source_type":'youtube',
                "source_url":meta.get("source_url"),
                "timestamp_seconds":seconds,
                "timestamp_delay":f"{int(seconds) // 60}:{int(seconds) % 60:02d}",
                "link": f"{source_url}&t={int(seconds)}s"
            })
        else:
            key=("pdf",meta.get("source"),meta.get("page"))
            if key in seen:
                continue
            seen.add(key)
            source=meta.get('source')
            sources.append({
                "source_type":"pdf",
                "filename": os.path.basename(source) if source else None,
                "page":meta.get("page",0)+1
            })


    return sources




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

def ask_with_tools(question:str,user_id:int,document_id:int,history=None):
    vectorstore = get_vectorstore()

    hybrid_retriever=build_hybrid_retriever(vectorstore,user_id,document_id,get_llm,k=8)
    final_retriever=build_reranking_retriever(hybrid_retriever,top_n=5)

    docs=final_retriever.invoke(question)
    context=format_docs(docs)
    sources=build_sources(docs)
    history_text=format_history(history,max_tokens=2000)

    web_search=get_web_search_tool()

    system_prompt = f"""You are a helpful study assistant. Use the document context below to answer questions about the material.

    If the student asks where they can learn more, find external resources, videos, or further reading — you MUST use the web_search tool to find real, current resources. NEVER invent, guess, or fabricate a URL, video link, or resource from memory. Only recommend links that appear in the web_search tool's actual results. If the tool returns no relevant results, say so honestly rather than making something up. Also the videos must be professional and must be not so childish, for instance recommend videos similar to Organic Chemistry Tutor, etc... . However this does not mean all videos should be from Organic Chemistry Tutor I am only giving an example.

    Document context:
    {context}

    Conversation history:
    {history_text}"""

    last_error = None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)
        llm_with_tools=llm.bind_tools([web_search])
        try:
            messages = [SystemMessage(content=system_prompt), HumanMessage(content=question)]
            response = llm_with_tools.invoke(messages)

            if response.tool_calls:
                messages.append(response)
                for tool_call in response.tool_calls:
                    if tool_call["name"] == "tavily_search":
                        result = web_search.invoke(tool_call["args"])
                        messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))
                final_response = llm_with_tools.invoke(messages)
                return extract_text(final_response),sources

            return extract_text(response),sources

        except ResourceExhausted as e:
            last_error=e
            continue

    raise last_error