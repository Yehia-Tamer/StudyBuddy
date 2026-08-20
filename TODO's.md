# StudyBuddy — Feature Enhancement Backlog

*Compiled during the Coursera GenAI/Agents specialization pause. To be worked through once the course finishes, per project convention (see main project summary).*

---

## Retrieval Quality (from RAG/Vector DB course modules)

1. ✅ **Source citations in chat answers** — implemented via `build_sources()` in `chat_chain.py`, covering all four source types (PDF page numbers, YouTube/audio timestamps with `mm:ss` display, web article titles/links). Deduplicated per-source, persisted on the `Message` row (`sources` column, JSON-in-string pattern matching `StudyPlanItem.subtopics`), returned through `SourceCitation` Pydantic schema with a `field_validator(mode='before')` for deserialization.
2. **HNSW parameter tuning** (`ef_search`, `ef_construction`, `max_neighbors`) once relevant at scale.
3. **Explicitly set Chroma's distance metric to** **`cosine`** instead of relying on the default (likely `l2`). Cheap fix.

## Architecture Reference

4. **LlamaIndex → LangChain retriever concept mapping** — if retrieval ever feels too flat (struggles connecting related concepts, or keyword-heavy queries underperform), these LangChain equivalents cover most of what LlamaIndex's advanced retrievers offer, without switching frameworks:
   | LlamaIndex             | LangChain equivalent                                                                                        |
   | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
   | Vector Index Retriever | `VectorStoreRetriever` (Chroma, FAISS, etc.)                                                                |
   | BM25 Retriever         | `BM25Retriever`                                                                                             |
   | Document Summary Index | No direct 1:1 — closest is a custom summary-routing step, or `MultiVectorRetriever` with summary embeddings |
   | Auto Merging Retriever | `ParentDocumentRetriever` (small chunks retrieved, larger parent context returned)                          |
   | Recursive Retriever    | No exact match — approximate with custom chained retrieval logic                                            |
   | QueryFusion Retriever  | `EnsembleRetriever` (combines multiple retrievers, supports weighted fusion)                                |
   Most directly useful candidates if retrieval quality becomes a real problem: `ParentDocumentRetriever` and `EnsembleRetriever`.

## New Ingestion Sources

5. ✅ **YouTube video → document ingestion** — complete. `youtube_loader.py` extracts video ID from multiple URL formats, fetches transcript (prefers manual over auto-generated), and chunks via a custom segment-aware accumulator (`chunk_transcript_with_timestamps`) that preserves each chunk's starting timestamp — replaced the original character-based `RecursiveCharacterTextSplitter` approach, which was discarding per-chunk timing. `Document` model has `source_type`/`source_url`. `POST /documents/youtube` endpoint live. Known placeholder: `filename` uses video ID, not real title (deferred, not blocking).
6. **Audio lecture ingestion** — loader (`audio_loader.py`, faster-whisper `base` model, same segment-aware timestamp-chunking pattern as YouTube) and repository function (`create_audio_document`) are written. **Remaining:** router endpoint (`POST /documents/audio`, `UploadFile`-based) not yet written; end-to-end test with a real audio file not yet run.
7. ✅ **Web article / blog post ingestion** — complete. `web_loader.py` uses `requests` (custom headers) + `trafilatura` for extraction, with graceful `WebArticleError` handling for connection failures, timeouts, and HTTP errors (some sites with aggressive bot/connection-level protection, e.g. ibm.com, are an accepted, documented limitation — not a bug). `create_web_document` uses the extracted article title as the `filename`. `POST /documents/web` endpoint live.
8. **PowerPoint/slide ingestion** — extract text (and possibly images) from raw `.pptx` files directly, rather than requiring export to PDF first.
9. **Handwritten notes via photo upload** — OCR a photo of handwritten notes; extends the existing OCR fallback (currently scoped to scanned PDFs) to photo input.
10. **Multimodal document understanding** — reasoning over images/diagrams/charts within PDFs directly, rather than OCR-then-text-only. Candidate patterns expected from the Multimodal GenAI Apps course module; watch for applicable techniques while going through it.

## New Output Formats

11. **Mind maps / concept diagrams** — generate a visual concept map from a document (topics + relationships) via structured LLM output, same pattern as existing flashcard/quiz generation (`JsonOutputParser` + Pydantic).
12. **Cheat sheet / one-page summary generator** — dense, skimmable exam-prep reference sheet per document, distinct from the conversational chat summary.
13. **Audio summary / podcast-style recap** — text-to-speech the document summary for on-the-go review. Natural pairing with the YouTube/audio ingestion work in #5/#6.

## Progress & Retention

14. **Spaced repetition scheduling for flashcards** — apply a spaced-repetition algorithm (Anki-style) to resurface flashcards at optimal review intervals, building on the existing persisted flashcard/progress data.
15. **Cross-document study plans informed by quiz performance** — extend the existing multi-document `StudyPlan` model to auto-suggest topics/documents needing review based on quiz grading history.

---

## Completed

- ✅ **Increase retriever `k`** — bumped to 8 via `search_kwargs`.
- ✅ **Empirically tune chunk size/overlap** — adjusted from 1000/200 baseline; further bumped to 2000/300 this session across PDF/web/YouTube/audio loaders to reduce embedding call volume per document.
- ✅ **Multi-query retrieval** — `MultiQueryRetriever.from_llm()` wrapping the filtered base retriever, with a dedicated `MULTI_RETRIEVER_KEYS` rotation pool + retry-on-`ResourceExhausted` in `key_rotation.py`. Verified working end-to-end via `/conversations/{id}/messages`.
- ✅ **Hybrid search (vector + BM25)** — implemented via `EnsembleRetriever`, improving retrieval of exact terminology alongside semantic matches.
- ✅ **Reranking** — retrieve more chunks than needed and rerank by relevance before passing context to the LLM.
- ✅ **Chroma `where_document` filtering** (`$contains`) alongside metadata filtering to improve retrieval precision for keyword-specific queries.
- ✅ **Source citations in chat answers** — see item 1 above.
- ✅ **YouTube ingestion** — see item 5 above.
- ✅ **Web article ingestion** — see item 7 above.
- ✅ **[NEW] Local embeddings (sentence-transformers) as the primary embedding path** — `all-MiniLM-L6-v2` via `HuggingFaceEmbeddings`, replacing Gemini's `gemini-embedding-001` as the default. Same reasoning as the earlier local-reranking decision: removes API cost/latency/rate-limit risk from a component that runs on every single document upload, not just chat. Triggered by repeatedly hitting Gemini's free-tier `RESOURCE_EXHAUSTED` quota during heavy testing — confirmed this wasn't a key-rotation bug (rotation across separate Google Cloud projects still hit the same wall, likely an account-level free-tier ceiling) before migrating. `GoogleGenerativeAIEmbeddings` kept in `embeddings.py` as a secondary/fallback option, not deleted. Required a full Chroma + Postgres wipe (`TRUNCATE ... RESTART IDENTITY CASCADE`) since vectors from different embedding models aren't compatible within the same collection — clean re-test confirmed PDF/YouTube/web all working correctly post-migration.

## Prioritization Notes (as of last discussion)

- **Bigger lifts, good but not first:** PPTX ingestion (#8), cross-document study plans (#15).
- **Lower priority / more speculative:** Mind maps (#11), cheat sheets (#12), podcast-style summaries (#13).
- **[NEW] Immediate priority given end-of-August target:** finish audio ingestion (router endpoint + e2e test) — the last open ingestion source from this session's scope, everything else built.