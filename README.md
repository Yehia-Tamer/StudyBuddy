# StudyBuddy

An AI-powered study assistant backend built with FastAPI, PostgreSQL, and Google Gemini. Upload notes, lecture PDFs, slide decks, audio recordings, YouTube videos, or web articles and StudyBuddy lets you chat with them, generates flashcards/quizzes/cheat sheets, builds personalized study plans, and can search the web for extra learning resources.

> **Status:** Backend feature-complete for this phase. Frontend and deployment are not yet started — paused here to focus on an AI/agents coursework track before resuming.

## Features

- **Auth** — JWT-based registration/login (bcrypt password hashing)
- **Multi-source document ingestion** — PDF, PowerPoint (.pptx), audio lectures, YouTube videos, and web articles, all chunked and embedded into a shared vector store:
  - **PDF** — includes an OCR fallback (Tesseract + Poppler) for scanned/image-based PDFs (e.g. CamScanner exports) when no extractable text layer is found
  - **PowerPoint** — text + speaker notes extracted per slide (one `Document` per slide before splitting), preserving slide-level metadata for citations
  - **Audio** — local transcription via faster-whisper, chunked with per-segment timestamps
  - **YouTube** — transcript fetched (manual preferred over auto-generated), chunked with per-segment timestamps
  - **Web articles** — `trafilatura`-based extraction with graceful handling of bot-protected/unreachable sites
- **Conversational RAG chat** — multi-turn chat grounded in your uploaded documents, with persisted conversation history, token-budgeted context (not just a fixed message count), follow-up questions rewritten into standalone queries before retrieval for improved recall, hybrid retrieval (vector + BM25) with multi-query expansion and cross-encoder reranking, and per-source-type citations (PDF page, PPTX slide, YouTube/audio timestamp, web article title/link)
- **Web search tool-calling** — when a question warrants it (e.g. "where can I learn more about this"), the assistant can call a web search tool (Tavily) to recommend real websites/videos, with prompting in place to prevent it from fabricating links
- **Flashcards** — auto-generated from one or more documents, mix of Q&A and True/False types, persisted with a many-to-many document association, with LLM-graded free-text answer checking (accepts semantically equivalent answers, not just exact matches)
- **Study plans** — generated from one or more documents, broken into prioritized topics with time estimates and subtopics, with per-item completion tracking
- **Quizzes** — generated from one or more documents at a chosen difficulty, persisted, graded on submission, with a `solved` flag to track completion
- **Cheat sheets** — one-page, exam-focused summaries generated from one or more documents (concepts, definitions, formulas, procedures)
- **Local embeddings** — `sentence-transformers/all-MiniLM-L6-v2` (via `HuggingFaceEmbeddings`) is the primary embedding path, run entirely locally to avoid API cost/latency/rate limits on every document upload. Gemini embeddings (`gemini-embedding-001`) are kept in `embeddings.py` as a secondary/fallback option.
- **Multi-key API rotation** — automatic fallback across multiple Gemini API keys (separate pools for generation, multi-query retrieval, and query rewriting) on rate-limit errors, so one exhausted key — or one exhausted pool — doesn't take down the app
- **Database migrations** — schema changes managed via Alembic rather than ad hoc table drops

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL (relational data), ChromaDB (vector store)
- **AI/LLM:** Google Gemini (via LangChain), LangChain for chains/prompts/parsers/retrievers
- **Embeddings:** sentence-transformers (local, primary), Gemini embeddings (fallback)
- **Auth:** JWT (python-jose), bcrypt
- **OCR:** pytesseract + pdf2image (Tesseract OCR + Poppler)
- **Audio transcription:** faster-whisper
- **YouTube transcripts:** youtube-transcript-api
- **Web article extraction:** requests + trafilatura
- **Web search:** Tavily
- **Reranking:** HuggingFace cross-encoder (`ms-marco-MiniLM-L-6-v2`) via `CrossEncoderReranker`
- **Token counting:** tiktoken (approximate budget for conversation history)

## Project Structure

```
app/
├── main.py                     # FastAPI app instance, router registration
├── database.py                  # engine, SessionLocal, Base, get_db()
├── models.py                     # SQLAlchemy models
├── schemas.py                     # Pydantic request/response schemas
├── JWTtoken.py                     # JWT creation/verification
├── oauth2.py                        # get_current_user dependency
├── hashing.py                        # password hashing helpers
│
├── routers/                    # FastAPI route definitions (thin — delegate to repository/)
│   ├── auth.py
│   ├── documents.py
│   ├── chat.py
│   ├── study_plans.py
│   ├── quizzes.py
│   ├── cheat_sheets.py
│   └── flashcards.py
│
├── repository/                 # Business logic + DB access, called by routers
│   ├── auth.py
│   ├── documents.py
│   ├── chat.py
│   ├── flashcards.py
│   ├── study_plans.py
│   ├── quizzes.py
│   └── cheat_sheets.py
│
├── rag/                         # RAG / LLM pipeline logic — kept separate from the API layer
│   ├── embeddings.py             # local (primary) + Gemini (fallback) embedding config
│   ├── vectorstore.py             # single source of truth for Chroma access
│   ├── retrievers.py               # hybrid (vector + BM25) retrieval, multi-query, reranking
│   ├── key_rotation.py              # Gemini API key rotation (generation / multi-query / query-rewrite / embedding pools)
│   ├── tools.py                      # Tavily web search tool
│   ├── config.py                      # shared LLM factory, token counting, doc/history formatting
│   │
│   ├── loaders/                # per-source-type loading + chunking
│   │   ├── pdf_loader.py
│   │   ├── pptx_loader.py
│   │   ├── audio_loader.py
│   │   ├── youtube_loader.py
│   │   └── web_loader.py
│   │
│   └── chains/                  # prompts, parsers, generation/grading chains per feature
│       ├── chat_chain.py
│       ├── flashcard_chain.py
│       ├── study_plan_chain.py
│       ├── quiz_chain.py
│       └── cheat_sheet_chain.py
│
alembic/                    # Migration history
```

## Setup

1. **Clone the repo and create a virtual environment**
   ```bash
   git clone <repo-url>
   cd StudyBuddy
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   ```

2. **Set up `.env`** (never committed — see `.gitignore`)
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/studybuddy
   SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   GOOGLE_API_KEY_1=<gemini api key>
   GOOGLE_API_KEY_2=<gemini api key>
   GOOGLE_API_KEY_3=<gemini api key>
   MULTI_RETRIEVER_KEY_1=<gemini api key>
   MULTI_RETRIEVER_KEY_2=<gemini api key>
   MULTI_RETRIEVER_KEY_3=<gemini api key>
   QUERY_ADJ_KEY_1=<gemini api key>
   QUERY_ADJ_KEY_2=<gemini api key>
   QUERY_ADJ_KEY_3=<gemini api key>
   TAVILY_API_KEY=<tavily api key>
   ```
   `EMBEDDING_KEY_1/2/3` are optional — only needed if you switch `embeddings.py` over to the Gemini fallback path.

3. **Install Tesseract OCR + Poppler** (for scanned PDF support) — see install notes below.

4. **Run migrations**
   ```bash
   alembic upgrade head
   ```

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```
   Interactive docs available at `http://127.0.0.1:8000/docs`.

### OCR dependencies (Windows)

- **Tesseract:** install via the [UB-Mannheim build](https://github.com/UB-Mannheim/tesseract/wiki), note the install path (default `C:\Program Files\Tesseract-OCR\tesseract.exe`)
- **Poppler:** download a [Windows release](https://github.com/oschwartz10612/poppler-windows/releases), extract, and note the `Library\bin` path
- Update the paths in `app/rag/loaders/pdf_loader.py` if they differ from the defaults

## API Overview

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Documents | `GET /documents/`, `GET /documents/{id}`, `POST /documents/pdf`, `POST /documents/pptx`, `POST /documents/audio`, `POST /documents/youtube`, `POST /documents/web`, `DELETE /documents/{id}` |
| Chat | `POST /conversations/`, `DELETE /conversations/{id}`, `POST /conversations/{id}/messages`, `GET /conversations/{id}/messages` |
| Flashcards | `POST /flashcards/`, `GET /flashcards/`, `GET /flashcards/{id}`, `POST /flashcards/{id}/answer` |
| Study Plans | `POST /study-plans/`, `GET /study-plans/`, `GET /study-plans/{id}`, `DELETE /study-plans/{id}`, `PUT /study-plans/{id}/items/{item_id}` |
| Quizzes | `POST /quizzes/`, `GET /quizzes/`, `GET /quizzes/{id}`, `POST /quizzes/{id}/grade`, `DELETE /quizzes/{id}` |
| Cheat Sheets | `POST /cheat_sheets/`, `GET /cheat_sheets/`, `GET /cheat_sheets/{id}`, `DELETE /cheat_sheets/{id}` |

Full request/response schemas are available via the auto-generated Swagger docs at `/docs`.

## Known Simplifications / Follow-ups

Documenting these honestly rather than hiding them — things to revisit when resuming:

- **Quiz grading assumes answer order matches question order** (positional list, not keyed by question ID) — works but is fragile if ordering assumptions ever break.
- **Chroma and Postgres are not automatically kept in sync** — deleting a document via the API cleans up both, but any manual DB surgery (e.g. dropping tables directly) will leave orphaned vectors in Chroma with no corresponding Postgres row. Always prefer the API's delete endpoints over manual SQL.
- **YouTube-ingested documents use the video ID as the filename**, not the real video title — a placeholder, not blocking.
- **No automated tests yet** — testing so far has been manual, via `/docs` and Postman.
- **No CI/CD, containerization, or deployment yet** — planned for the "ship it" phase.
- **`README.md` (this file) is a working draft** — will be expanded with screenshots/demo instructions once the frontend exists.

## Roadmap

- [ ] Multimodal document understanding (reasoning over images/diagrams/charts within PDFs and PPTX, not just OCR'd text)
- [ ] Frontend (React or similar)
- [ ] Docker + docker-compose
- [ ] Deploy to Railway/Render
- [ ] Automated tests
- [ ] Revisit quiz answer-ordering fragility