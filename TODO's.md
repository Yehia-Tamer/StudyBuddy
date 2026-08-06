# StudyBuddy — Feature Enhancement Backlog
*Compiled during the Coursera GenAI/Agents specialization pause. To be worked through once the course finishes, per project convention (see main project summary).*

---

## Retrieval Quality (from RAG/Vector DB course modules)

1. **Reranking** — retrieve more chunks than needed, rerank by true relevance before prompting.
2. **Hybrid search** (vector + keyword/BM25) — catch exact-term matches (formulas, named theorems, technical vocabulary) semantic search alone might miss.
3. **Chroma `where_document` filtering** (`$contains`) alongside existing metadata filters — could help disambiguate near-miss semantic matches.
4. **Source citations in chat answers** — `return_source_documents` equivalent; page-level metadata already exists from `PyPDFLoader`.
5. **HNSW parameter tuning** (`ef_search`, `ef_construction`, `max_neighbors`) once relevant at scale.
6. **Explicitly set Chroma's distance metric to `cosine`** instead of relying on the default (likely `l2`). Cheap fix.

## Architecture Reference

7. **LlamaIndex → LangChain retriever concept mapping** — if retrieval ever feels too flat (struggles connecting related concepts, or keyword-heavy queries underperform), these LangChain equivalents cover most of what LlamaIndex's advanced retrievers offer, without switching frameworks:

    | LlamaIndex | LangChain equivalent |
    |---|---|
    | Vector Index Retriever | `VectorStoreRetriever` (Chroma, FAISS, etc.) |
    | BM25 Retriever | `BM25Retriever` |
    | Document Summary Index | No direct 1:1 — closest is a custom summary-routing step, or `MultiVectorRetriever` with summary embeddings |
    | Auto Merging Retriever | `ParentDocumentRetriever` (small chunks retrieved, larger parent context returned) |
    | Recursive Retriever | No exact match — approximate with custom chained retrieval logic |
    | QueryFusion Retriever | `EnsembleRetriever` (combines multiple retrievers, supports weighted fusion) |

    Most directly useful candidates if retrieval quality becomes a real problem: `ParentDocumentRetriever` and `EnsembleRetriever`.

## New Ingestion Sources

8. **YouTube video → document ingestion** — paste a URL, fetch transcript, chunk + store as a `Document` (alongside PDFs) so it flows through the existing pipeline (embeddings, flashcards, quizzes, study plans, chat) for free. Notes:
    - Reuses the `loader.py` pattern — a new `youtube_loader.py` producing the same `Document` chunk format as the PDF loader.
    - `Document` model likely needs a `source_type` (`"pdf"` vs `"youtube"`) and `source_url` field.
    - Transcript timestamps (already captured via `t.start` in the transcript API) enable a future "at what point in the video is X explained?" feature — genuinely differentiated from PDF-based Q&A.
    - Decide: store summary-as-document, transcript-as-document, or both (likely both — transcript for retrieval/chat fidelity, summary for quick reference).
9. **Audio lecture ingestion** — recorded `.mp3`/`.wav` → speech-to-text transcription → same pipeline as #8. Near-identical pattern to the YouTube feature, different source.
10. **Web article / blog post ingestion** — paste a URL, scrape and clean article text into a document (distinct from the existing Tavily web-search tool, which searches rather than ingests a specific known page).
11. **PowerPoint/slide ingestion** — extract text (and possibly images) from raw `.pptx` files directly, rather than requiring export to PDF first.
12. **Handwritten notes via photo upload** — OCR a photo of handwritten notes; extends the existing OCR fallback (currently scoped to scanned PDFs) to photo input.
13. **Multimodal document understanding** — reasoning over images/diagrams/charts within PDFs directly, rather than OCR-then-text-only. Candidate patterns expected from the Multimodal GenAI Apps course module; watch for applicable techniques while going through it.

## New Output Formats

14. **Mind maps / concept diagrams** — generate a visual concept map from a document (topics + relationships) via structured LLM output, same pattern as existing flashcard/quiz generation (`JsonOutputParser` + Pydantic).
15. **Cheat sheet / one-page summary generator** — dense, skimmable exam-prep reference sheet per document, distinct from the conversational chat summary.
16. **Audio summary / podcast-style recap** — text-to-speech the document summary for on-the-go review. Natural pairing with the YouTube/audio ingestion work in #8/#9.

## Progress & Retention

17. **Spaced repetition scheduling for flashcards** — apply a spaced-repetition algorithm (Anki-style) to resurface flashcards at optimal review intervals, building on the existing persisted flashcard/progress data.
18. **Cross-document study plans informed by quiz performance** — extend the existing multi-document `StudyPlan` model to auto-suggest topics/documents needing review based on quiz grading history.

---

## Completed

- ✅ **Increase retriever `k`** — bumped to 8 via `search_kwargs`.
- ✅ **Empirically tune chunk size/overlap** — adjusted from 1000/200 baseline.
- ✅ **Multi-query retrieval** — `MultiQueryRetriever.from_llm()` wrapping the filtered base retriever, with a dedicated `MULTI_RETRIEVER_KEYS` rotation pool + retry-on-`ResourceExhausted` in `key_rotation.py`. Verified working end-to-end via `/conversations/{id}/messages`.

## Prioritization Notes (as of last discussion)

- **Bigger lifts, good but not first:** PPTX ingestion (#11), cross-document study plans (#18).
- **Lower priority / more speculative:** Mind maps (#14), cheat sheets (#15), podcast-style summaries (#16).