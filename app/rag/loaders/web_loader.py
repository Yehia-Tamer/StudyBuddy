import requests
import trafilatura
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


class WebArticleError(Exception):
    pass


def fetch_html(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.exceptions.ConnectionError:
        raise WebArticleError(
            "Could not connect to this site — it may be blocking automated requests."
        )
    except requests.exceptions.Timeout:
        raise WebArticleError("The site took too long to respond.")
    except requests.exceptions.HTTPError as e:
        raise WebArticleError(f"The site returned an error: {e.response.status_code}")
    except requests.RequestException as e:
        raise WebArticleError(f"Could not fetch this page: {e}")


def fetch_article(url: str) -> dict:
    html = fetch_html(url)

    text = trafilatura.extract(html)
    if not text or not text.strip():
        raise WebArticleError(f"No extractable article content found at: {url}")

    metadata = trafilatura.extract_metadata(html)
    title = metadata.title if metadata and metadata.title else url

    return {"text": text, "title": title}


def load_web_document(
    url: str, chunk_size: int = 2000, chunk_overlap: int = 300
) -> list[Document]:
    article = fetch_article(url)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.create_documents(
        texts=[article["text"]],
        metadatas=[
            {
                "source_type": "web",
                "source_url": url,
                "title": article["title"],
            }
        ],
    )

    return chunks
