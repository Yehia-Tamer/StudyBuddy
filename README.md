# StudyBuddy

An AI-powered study assistant backend built with FastAPI, PostgreSQL, and Google Gemini. Upload your notes/lecture PDFs and StudyBuddy lets you chat with them, generates flashcards and quizzes, builds personalized study plans, and can search the web for extra learning resources.

> **Status:** Backend feature-complete for this phase. Frontend and deployment are not yet started — paused here to focus on an AI/agents coursework track before resuming.

## Features

- **Auth** — JWT-based registration/login (bcrypt password hashing)
- **Document upload** — PDF upload with chunking + embedding (Gemini embeddings + ChromaDB). Includes an OCR fallback (Tesseract + Poppler) for scanned/image-based PDFs (e.g. CamScanner exports) when no extractable text layer is found
- **Conversational RAG chat** — multi-turn chat grounded in your uploaded documents, with persisted conversation history and token-budgeted context (not just a fixed message count)
- **Web search tool-calling** — when a question warrants it (e.g. "where can I learn more about this"), the assistant can call a web search tool (Tavily) to recommend real websites/videos, with prompting in place to prevent it from fabricating links
- **Flashcards** — auto-generated from a document, mix of Q&A and True/False types, persisted per document, with LLM-graded free-text answer checking (accepts semantically equivalent answers, not just exact matches)
- **Study plans** — generated from one or more documents, broken into prioritized topics with time estimates and subtopics, with per-item completion tracking
- **Quizzes** — generated from one or more documents at a chosen difficulty, persisted, graded on submission, with a `solved` flag to track completion
- **Multi-key API rotation** — automatic fallback across multiple Gemini API keys on rate-limit errors, so one exhausted key doesn't take down the app
- **Database migrations** — schema changes managed via Alembic rather than ad hoc table drops

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL (relational data), ChromaDB (vector store)
- **AI/LLM:** Google Gemini (via LangChain), LangChain for chains/prompts/parsers
- **Auth:** JWT (python-jose), bcrypt
- **OCR:** pytesseract + pdf2image (Tesseract OCR + Poppler)
- **Web search:** Tavily
- **Token counting:** tiktoken (approximate budget for conversation history)

## Project Structure

```
app/
├── main.py                # FastAPI app instance, router registration
├── database.py             # engine, SessionLocal, Base, get_db()
├── models.py                # SQLAlchemy models
├── schemas.py                # Pydantic request/response schemas
├── JWTtoken.py                # JWT creation/verification
├── oauth2.py                   # get_current_user dependency
├── hashing.py                   # password hashing helpers
│
├── routers/                # FastAPI route definitions (thin — delegate to repository/)
│   ├── auth.py
│   ├── documents.py
│   ├── chat.py
│   ├── study_plans.py
│   └── quiz.py
│
├── repository/              # Business logic + DB access, called by routers
│   ├── auth.py
│   ├── documents.py
│   ├── chat.py
│   ├── flashcards.py
│   ├── study_plans.py
│   └── quiz.py
│
├── rag/                        # RAG / LLM pipeline logic — kept separate from the API layer
│   ├── embeddings.py            # Gemini embedding model config
│   ├── vectorstore.py            # single source of truth for Chroma access
│   ├── loader.py                  # PDF loading, splitting, OCR fallback
│   ├── key_rotation.py             # Gemini API key rotation
│   ├── tools.py                     # Tavily web search tool
│   └── chain.py                      # prompts, parsers, RAG chains, flashcard/study
│                                       plan/quiz generation, grading, tool-calling chat
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
   TAVILY_API_KEY=<tavily api key>
   ```

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
- Update the paths in `app/rag/loader.py` if they differ from the defaults

## API Overview

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Documents | `GET/POST /documents/`, `DELETE /documents/{id}` |
| Chat | `POST /conversations/`, `POST/GET /conversations/{id}/messages` |
| Flashcards | `POST/GET /documents/{id}/flashcards`, `POST /flashcards/{id}/answer` |
| Study Plans | `POST/GET /study-plans/`, `GET /study-plans/{id}`, `DELETE /study-plans/{id}`, `PATCH /study-plans/{id}/items/{item_id}` |
| Quiz | `POST /quiz/generate`, `GET /quiz/`, `GET /quiz/{id}`, `POST /quiz/{id}/grade` |

Full request/response schemas are available via the auto-generated Swagger docs at `/docs`.

## Known Simplifications / Follow-ups

Documenting these honestly rather than hiding them — things to revisit when resuming:

- **Quiz grading assumes answer order matches question order** (positional list, not keyed by question ID) — works but is fragile if ordering assumptions ever break.
- **Chroma and Postgres are not automatically kept in sync** — deleting a document via the API cleans up both, but any manual DB surgery (e.g. dropping tables directly) will leave orphaned vectors in Chroma with no corresponding Postgres row. Always prefer the API's delete endpoints over manual SQL.
- **No automated tests yet** — testing so far has been manual, via `/docs` and Postman.
- **No CI/CD, containerization, or deployment yet** — planned for the "ship it" phase.
- **`README.md` (this file) is a working draft** — will be expanded with screenshots/demo instructions once the frontend exists.

## Roadmap

- [ ] Frontend (React or similar)
- [ ] Docker + docker-compose
- [ ] Deploy to Railway/Render
- [ ] Automated tests
- [ ] Revisit quiz answer-ordering fragility
- [ ] Possible: reranking / multi-hop retrieval for improved RAG quality (pending coursework)
