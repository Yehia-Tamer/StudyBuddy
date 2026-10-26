import os
import time

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

from app.rag.config import LLM_MODELS

load_dotenv()
for key_name in ["GOOGLE_API_KEY_1", "GOOGLE_API_KEY_2", "GOOGLE_API_KEY_3"]:
    for model in LLM_MODELS:
        llm = ChatGoogleGenerativeAI(
            model=model, google_api_key=os.getenv(key_name), timeout=30, max_retries=1
        )
        start = time.time()
        try:
            llm.invoke("Say OK")
            result = "OK"
        except Exception as e:
            result = f"{type(e).__name__}: {str(e)[:120]}"
        print(f"{key_name:18} {model:24} {time.time() - start:6.1f}s  {result}")