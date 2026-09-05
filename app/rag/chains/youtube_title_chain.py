from google.api_core.exceptions import ResourceExhausted
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from app.rag.config import get_llm
from app.rag.key_rotation import API_KEYS, get_next_key
from app.rag.vectorstore import get_vectorstore
from pydantic import BaseModel

class YoutubeTitleLLM(BaseModel):
    title:str

youtube_title_parser=JsonOutputParser(pydantic_object=YoutubeTitleLLM)

PROMPT = PromptTemplate(
    template="""
You are an AI study assistant responsible for creating a clear and useful title for a YouTube video based on its transcript.

Your task is to identify the main topic and purpose of the video and generate ONE concise title that accurately represents its overall content.

Guidelines:
- Focus on the main subject or concept discussed in the transcript.
- Make the title specific enough to distinguish the video from unrelated content.
- Keep it concise, ideally between 4 and 10 words.
- Use natural, professional wording suitable for a student's study library.
- Do not use clickbait, exaggerated language, or unnecessary words.
- Do not include phrases such as "YouTube Video", "Video Transcript", or "Transcript".
- Do not invent information that is not supported by the transcript.
- If the video covers multiple topics, choose the broader topic that best represents the overall video rather than focusing on a minor detail.
- Return only the title in the required JSON format.

{format_instructions}

YouTube Transcript:
{transcript}
""",
    input_variables=["transcript"],
    partial_variables={
        "format_instructions": youtube_title_parser.get_format_instructions()
    },
)


def generate_youtube_title(transcript:str):
    last_error=None
    for _ in range(len(API_KEYS)):
        key = get_next_key()
        llm = get_llm(key)

        try:
            chain=PROMPT|llm|youtube_title_parser
            response=chain.invoke({"transcript":transcript})
            return response
        except ResourceExhausted as e:
            last_error=e
            continue

    raise last_error