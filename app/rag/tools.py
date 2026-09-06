import os
from langchain_tavily import TavilySearch


def get_web_search_tool():
    return TavilySearch(
        api_key=os.getenv("TAVILY_API_KEY"), max_results=5, topic="general"
    )
