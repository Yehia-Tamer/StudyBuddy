# StudyBuddy

An AI-powered, full-stack study assistant. Upload notes, lecture PDFs, slide decks, audio recordings, YouTube videos, or web articles, then chat with them, generate flashcards/quizzes/cheat sheets, build a personalized study plan, and search the web for extra learning resources.

The backend is a FastAPI + PostgreSQL + ChromaDB RAG pipeline built on Google Gemini (via LangChain). The frontend is a React + Vite single-page app that covers every backend feature end to end.

> **Status:** Backend is feature-complete for this phase. The frontend now covers every backend feature — auth, document upload, chat, flashcards, quizzes, study plans, and cheat sheets. Automated tests, CI/CD, containerization, and deployment are still outstanding (see [Roadmap](#roadmap)).

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [How the RAG Pipeline Works](#how-the-rag-pipeline-works)
- [Project Structure](#project-structure)
- [About the Frontend](#about-the-frontend)
- [Setup](#setup)
- [API Overview](#api-overview)
- [Known Simplifications / Follow-ups](#known-simplifications--follow-ups)
- [Roadmap](#roadmap)

## Features

### Backend

- **Auth** — JWT-based registration/login. Passwords are SHA-256-hashed and base64-encoded before bcrypt (`app/hashing.py`), which sidesteps bcrypt's 72-byte input limit.
- **Multi-source document ingestion** — PDF, PowerPoint (`.pptx`), audio lectures, YouTube videos, and web articles, all chunked and embedded into a shared vector store:
  - **PDF** — OCR fallback (Tesseract + Poppler) for scanned/image-based PDFs when no extractable text layer is found.
  - **PowerPoint** — text + speaker notes extracted per slide, preserving slide-level metadata for citations.
  - **Audio** — local transcription via `faster-whisper`, chunked with per-segment timestamps.
  - **YouTube** — transcript fetched (manual preferred over auto-generated), chunked with per-segment timestamps, and given an LLM-generated descriptive title (`youtube_title_chain.py`) instead of falling back to the raw video ID.
  - **Web articles** — `trafilatura`-based extraction with graceful handling of bot-protected/unreachable sites.
- **Conversational RAG chat** — multi-turn chat grounded in your uploaded documents, with persisted history, token-budgeted context, follow-up questions rewritten into standalone queries before retrieval, hybrid retrieval (vector + BM25) with multi-query expansion and cross-encoder reranking, and per-source-type citations (PDF page, PPTX slide, YouTube/audio timestamp, web article title/link).
- **Web search tool-calling** — when a question warrants it (e.g. "where can I learn more"), the assistant calls a Tavily web search tool to recommend real resources, with prompting in place to prevent it from fabricating links.
- **Flashcards** — auto-generated from one or more documents, mix of Q&A and True/False types, with LLM-graded free-text answer checking (accepts semantically equivalent answers, not just exact matches).
- **Study plans** — generated from one or more documents, broken into prioritized topics with time estimates and subtopics, with per-item completion tracking.
- **Quizzes** — generated at a chosen difficulty, persisted, graded on submission, with a `solved` flag.
- **Cheat sheets** — one-page, exam-focused summaries (concepts, definitions, formulas, procedures).
- **Local embeddings** — `sentence-transformers/all-MiniLM-L6-v2` as the primary embedding path (avoids API cost/latency/rate limits on every upload); Gemini embeddings kept as a fallback in `embeddings.py`.
- **Multi-key API rotation** — automatic fallback across multiple Gemini API keys (separate pools for generation, multi-query retrieval, and query rewriting) on rate-limit errors.
- **Database migrations** — schema changes managed via Alembic rather than ad hoc table drops.

### Frontend

- **Auth flow** — register/login backed by the JWT API; the token is stored in `localStorage` and attached to every request automatically via an axios request interceptor (`src/client.js`); protected routes redirect to `/login` when logged out.
- **Document library** — upload PDF/PPTX/audio files or paste a YouTube/web URL, with per-type inputs and "still working…" hints on slow uploads (e.g. audio transcription).
- **Chat** — per-document or general chat, typing indicator, cancellable in-flight requests (`AbortController`), auto-resizing input, auto-scroll, and clickable inline source citations (page/slide/timestamp/link) rendered as chips; the active conversation is persisted to `localStorage` so it survives a page refresh.
- **Flashcards** — generate-from-documents flow with a count picker, per-card free-text answer checking against the LLM grader, and per-card delete.
- **Quizzes** — difficulty + question-count picker, mixed Q&A/True-False rendering, submit-and-grade flow with per-question feedback and correct-answer reveal.
- **Study plans** — priority-color-coded topic breakdown with per-item completion checkboxes and subtopic lists.
- **Cheat sheets** — Markdown-rendered one-page summaries, including LaTeX math via KaTeX.
- **Consistent "Generate" vs "Library" pattern** across Flashcards/Quizzes/Study Plans/Cheat Sheets/Chat, with library data fetched (and cached) only the first time a tab is opened.
- **Small custom design system** (`src/styles/theme.css`) — CSS custom properties for color, type (Fraunces display serif + Inter UI sans), spacing/radius/shadow, and motion, with `prefers-reduced-motion` respected globally.

## Tech Stack

### Backend

- **Framework:** FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL (relational data), ChromaDB (vector store)
- **AI/LLM:** Google Gemini (via LangChain), LangChain for chains/prompts/parsers/retrievers
- **Embeddings:** sentence-transformers (local, primary), Gemini embeddings (fallback)
- **Auth:** JWT (`python-jose`), bcrypt
- **OCR:** pytesseract + pdf2image (Tesseract OCR + Poppler)
- **Audio transcription:** faster-whisper
- **YouTube transcripts:** youtube-transcript-api
- **Web article extraction:** requests + trafilatura
- **Web search:** Tavily
- **Reranking:** HuggingFace cross-encoder (`ms-marco-MiniLM-L-6-v2`) via `CrossEncoderReranker`
- **Token counting:** tiktoken (approximate budget for conversation history)

### Frontend

- **Framework:** React 19 + Vite 8 (`@vitejs/plugin-react`)
- **Routing:** react-router-dom v7
- **HTTP:** axios (single shared instance + JWT interceptor)
- **Markdown/Math:** react-markdown + remark-gfm + remark-math + rehype-katex + katex
- **Styling:** CSS Modules per component/page + a shared design-token stylesheet (`theme.css`)
- **Linting:** ESLint (flat config) with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`

## How the RAG Pipeline Works

A user's question moves through several stages before an answer is generated:

**Query → Rewrite → Hybrid Retrieve → Rerank → Augment → Generate**

### 1. Query rewriting
Follow-up questions are often vague on their own. If a user asks *"What are the jobs in the AI field?"* and then follows up with *"What courses can I take to land one of them?"*, the phrase "one of them" has no meaning outside the conversation history. Before retrieval, the query is rewritten into a standalone version — e.g. *"What courses can I take to land a job in the AI field?"* — using the conversation history for context. This rewritten query is used **only for retrieval**; it doesn't replace the user's original question in the final generation step.

### 2. Hybrid retrieval (vector + BM25)
A pure vector (semantic) retriever matches based on meaning, but can miss exact keyword matches. A pure keyword retriever (BM25) catches exact terms but misses paraphrases. Combining both in an `EnsembleRetriever` improves recall by covering both failure modes.

### 3. Multi-query expansion
A single query phrasing might not lexically or semantically match how the answer is actually worded in the source documents, causing relevant chunks to be missed at retrieval time. `MultiQueryRetriever` generates several rephrasings of the query, retrieves candidates for each, and merges the results — reducing the chance that a bad phrasing alone causes poor recall.

### 4. Cross-encoder reranking
Initial retrieval uses a **bi-encoder**: query and documents are embedded separately, so similarity can be computed cheaply (cosine similarity) across the entire corpus. This is fast enough to scale to thousands of chunks, but less precise.

Reranking uses a **cross-encoder**, which processes the query and each candidate document *together*, letting the model attend across both for a much more accurate relevance judgment. This is too expensive to run over an entire corpus, but by this stage the hybrid retriever has already narrowed things down to a small candidate set (~8 chunks) — a scale where the cross-encoder's extra accuracy is worth the extra cost.

### 5. Grounded citations
Citations are **not generated by the LLM** — they come directly from metadata attached to each chunk during ingestion (page number, filename, slide index, or timestamp, depending on source type). This metadata is carried through the entire pipeline and used to build the citation list independently of the model's output. Because citations are derived from the retrieved chunk itself rather than the LLM's response, they can't be hallucinated — the model doesn't have to accurately report its own sources, since the system already knows them.

## Project Structure

```
app/
├── main.py                     # FastAPI app instance, router registration, CORS
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
│       ├── cheat_sheet_chain.py
│       └── youtube_title_chain.py
│
alembic/                    # Migration history

frontend/
├── index.html
├── vite.config.js
├── eslint.config.js
├── public/                  # favicon, icon sprite
└── src/
    ├── main.jsx               # app entry, wraps App in BrowserRouter
    ├── App.jsx                 # route table
    ├── client.js                # shared axios instance + JWT interceptor
    ├── styles/
    │   ├── theme.css              # design tokens
    │   └── forms.module.css
    ├── context/
    │   └── AuthContext.jsx         # login/register/logout/user state
    ├── utils/
    │   └── jwt.js                   # client-side JWT decode/expiry check (display only)
    ├── components/
    │   ├── AuthLayout.jsx             # shared Login/Register layout
    │   ├── ProtectedRoute.jsx          # redirects unauthenticated users
    │   ├── Markdown.jsx                 # shared GFM + KaTeX renderer
    │   └── layout/
    │       └── AppShell.jsx               # sidebar nav + logout
    ├── api/                                # one thin axios wrapper per feature
    │   ├── documents.js
    │   ├── chat.js
    │   ├── flashcards.js
    │   ├── quizzes.js
    │   ├── studyPlans.js
    │   └── cheatSheets.js
    └── pages/                                # one page per feature
        ├── Login.jsx / Register.jsx
        ├── Documents.jsx
        ├── Chat.jsx
        ├── Flashcards.jsx
        ├── Quizzes.jsx
        ├── StudyPlans.jsx
        └── CheatSheets.jsx
```

## About the Frontend

The frontend was coded by hand by me, the project's author. Claude (Anthropic's AI assistant) was used throughout as a coding assistant — for planning components, working through bugs, and getting feedback on styling/design decisions — but the implementation itself was written by me.

## Setup

### Backend

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

#### OCR dependencies (Windows)

- **Tesseract:** install via the [UB-Mannheim build](https://github.com/UB-Mannheim/tesseract/wiki), note the install path (default `C:\Program Files\Tesseract-OCR\tesseract.exe`)
- **Poppler:** download a [Windows release](https://github.com/oschwartz10612/poppler-windows/releases), extract, and note the `Library\bin` path
- Update the paths in `app/rag/loaders/pdf_loader.py` if they differ from the defaults

### Frontend

1. ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. The app is served at `http://localhost:5173` (see `vite.config.js`).
3. Make sure the backend is running at `http://127.0.0.1:8000` — that's the hardcoded `baseURL` in `src/client.js`, and it's the only origin the backend's CORS config (`app/main.py`) currently allows.

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## API Overview

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Documents | `GET /documents/`, `GET /documents/{id}`, `POST /documents/pdf`, `POST /documents/pptx`, `POST /documents/audio`, `POST /documents/youtube`, `POST /documents/web`, `DELETE /documents/{id}` |
| Chat | `POST /conversations/`, `GET /conversations/`, `GET /conversations/{id}`, `DELETE /conversations/{id}`, `POST /conversations/{id}/messages`, `GET /conversations/{id}/messages` |
| Flashcards | `POST /flashcards/`, `GET /flashcards/`, `GET /flashcards/{id}`, `POST /flashcards/{id}/answer`, `DELETE /flashcards/{id}` |
| Study Plans | `POST /study-plans/`, `GET /study-plans/`, `GET /study-plans/{id}`, `DELETE /study-plans/{id}`, `PUT /study-plans/{id}/items/{item_id}` |
| Quizzes | `POST /quizzes/`, `GET /quizzes/`, `GET /quizzes/{id}`, `POST /quizzes/{id}/grade`, `DELETE /quizzes/{id}` |
| Cheat Sheets | `POST /cheat_sheets/`, `GET /cheat_sheets/`, `GET /cheat_sheets/{id}`, `DELETE /cheat_sheets/{id}` |

Full request/response schemas are available via the auto-generated Swagger docs at `/docs`.

## Known Simplifications / Follow-ups

Documenting these honestly rather than hiding them — things to revisit later:

- **Quiz grading assumes answer order matches question order** (positional list, not keyed by question ID) — the frontend submits answers in `activeQuiz.questions` order to match, but it's fragile if that assumption ever breaks.
- **Chroma and Postgres are not automatically kept in sync** — deleting a document via the API cleans up both, but any manual DB surgery (e.g. dropping tables directly) will leave orphaned vectors in Chroma with no corresponding Postgres row. Always prefer the API's delete endpoints over manual SQL.
- **Login returns `404` for both an unknown username and a wrong password** (`app/repository/auth.py`), rather than the more conventional `401` — a minor inconsistency worth revisiting.
- **The frontend's API base URL is hardcoded** to `http://127.0.0.1:8000` in `src/client.js` rather than coming from an environment variable — fine for local dev, not yet configurable for other environments.
- **No mobile navigation yet** — the sidebar is hidden below 900px (`AppShell.module.css`) with no mobile-friendly replacement; the app is desktop-first for now.
- **No automated tests yet**, backend or frontend — testing so far has been manual (`/docs`, Postman, and clicking through the UI).
- **No CI/CD, containerization, or deployment yet.**

## Roadmap

- [ ] Multimodal document understanding (reasoning over images/diagrams/charts within PDFs and PPTX, not just OCR'd text)
- [ ] Mobile-responsive navigation for the frontend
- [ ] Docker + docker-compose
- [ ] Deploy to Railway/Render
- [ ] Automated tests (backend and frontend)
- [ ] Revisit quiz answer-ordering fragility
- [ ] Handwritten notes via photo upload (OCR)
- [ ] Audio summary / podcast-style recap
- [ ] Spaced repetition scheduling for flashcards
- [ ] Cross-document study plans informed by quiz performance