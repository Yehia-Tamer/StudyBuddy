# StudyBuddy — Feature Enhancement Backlog

*Compiled during the Coursera GenAI/Agents specialization pause. To be worked through once the course finishes, per project convention (see main project summary).*

---

## Retrieval Quality (from RAG/Vector DB course modules)

1. ✅ **Source citations in chat answers** — implemented via `build_sources()` in `chat_chain.py`, covering all five source types (PDF page numbers, PPTX slide numbers, YouTube/audio timestamps with `mm:ss` display, web article titles/links). Deduplicated per-source, persisted on the `Message` row (`sources` column, JSON-in-string pattern matching `StudyPlanItem.subtopics`), returned through `SourceCitation` Pydantic schema with a `field_validator(mode='before')` for deserialization.
2. ✅ **HNSW parameter tuning** (`ef_search`, `ef_construction`, `max_neighbors`) — complete.
3. ✅ **Explicitly set Chroma's distance metric to `cosine`** instead of relying on the default — complete.

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
6. ✅ **Audio lecture ingestion** — complete. `audio_loader.py` (faster-whisper `base` model) uses the same segment-aware timestamp-chunking pattern as YouTube. `create_audio_document` handles the temp-file lifecycle (save upload → transcribe → chunk → embed → delete temp file in `finally`, regardless of outcome). `POST /documents/audio` endpoint live, end-to-end tested with real audio.
7. ✅ **Web article / blog post ingestion** — complete. `web_loader.py` uses `requests` (custom headers) + `trafilatura` for extraction, with graceful `WebArticleError` handling for connection failures, timeouts, and HTTP errors (some sites with aggressive bot/connection-level protection, e.g. ibm.com, are an accepted, documented limitation — not a bug). `create_web_document` uses the extracted article title as the `filename`. `POST /documents/web` endpoint live.
8. ✅ **PowerPoint/slide ingestion** — complete. `pptx_loader.py` extracts text from all shapes with text frames plus speaker notes per slide, builds one `Document` per slide (mirroring the PDF-loader's one-`Document`-per-page pattern) before splitting, so `slide`/`total_slides` metadata is correctly preserved onto every resulting chunk. `create_pptx_document` follows the same repository pattern as PDF upload. `POST /documents/pptx` endpoint live, tested. Scoped to text + speaker notes only — no image/diagram extraction (that's covered separately by #10, multimodal document understanding).
9. **Handwritten notes via photo upload** — OCR a photo of handwritten notes; extends the existing OCR fallback (currently scoped to scanned PDFs) to photo input.
10. **Multimodal document understanding** — reasoning over images/diagrams/charts within PDFs (and now PPTX) directly, rather than OCR-then-text-only. Candidate patterns expected from the Multimodal GenAI Apps course module; watch for applicable techniques while going through it.

## New Output Formats

11. ⏸️ **Mind maps / concept diagrams** — deprioritized/parked, not building for the end-of-August scope. Schema (`MindMapNode` recursive tree, `MindMapGenerateRequest`, `MindMapResponse`) and the `mind_maps` table + `mind_map_documents` association table are already in place from the migration, so this can be picked up quickly later if needed — just the repository generation function, chain, and router are unwritten. Reasoning to skip for now: functionally overlaps heavily with `StudyPlan` (topic → subtopics is already a working hierarchy); the main differentiator (arbitrary-depth nesting vs. `StudyPlan`'s flat 2-level structure) has limited payoff without a frontend to actually render the tree visually, which doesn't exist yet. Revisit if a real need for deeper hierarchy or visual concept-mapping comes up.
12. ✅ **Cheat sheet / one-page summary generator** — complete. `cheat_sheet_chain.py` uses `JsonOutputParser` + a `CheatSheetLLM` Pydantic model (title, topic, content) prompted for concise, exam-focused coverage (concepts, definitions, formulas, procedures) pulled from the target documents' chunks via `vectorstore.get(where=...)`. `generate_and_save_cheat_sheet` validates document ownership, generates, and persists via the `cheat_sheet_documents` many-to-many association. `POST /cheat_sheets` endpoint live, tested working end-to-end including `document_ids` correctly surfacing in the response.
13. **Audio summary / podcast-style recap** — text-to-speech the document summary for on-the-go review. Natural pairing with the YouTube/audio ingestion work in #5/#6.

## Progress & Retention

14. **Spaced repetition scheduling for flashcards** — apply a spaced-repetition algorithm (Anki-style) to resurface flashcards at optimal review intervals, building on the existing persisted flashcard/progress data.
15. **Cross-document study plans informed by quiz performance** — extend the existing multi-document `StudyPlan` model to auto-suggest topics/documents needing review based on quiz grading history.

---

## Completed

- ✅ **Increase retriever `k`** — bumped to 8 via `search_kwargs`.
- ✅ **Empirically tune chunk size/overlap** — adjusted from 1000/200 baseline; further bumped to 2000/300 across PDF/web/YouTube/audio/PPTX loaders to reduce embedding call volume per document.
- ✅ **Multi-query retrieval** — `MultiQueryRetriever.from_llm()` wrapping the filtered base retriever, with a dedicated `MULTI_RETRIEVER_KEYS` rotation pool + retry-on-`ResourceExhausted` in `key_rotation.py`. Verified working end-to-end via `/conversations/{id}/messages`.
- ✅ **Hybrid search (vector + BM25)** — implemented via `EnsembleRetriever`, improving retrieval of exact terminology alongside semantic matches.
- ✅ **Reranking** — retrieve more chunks than needed and rerank by relevance before passing context to the LLM.
- ✅ **Chroma `where_document` filtering** (`$contains`) alongside metadata filtering to improve retrieval precision for keyword-specific queries.
- ✅ **HNSW parameter tuning** — see item 2 above.
- ✅ **Cosine distance metric** — see item 3 above.
- ✅ **Source citations in chat answers** — see item 1 above.
- ✅ **YouTube ingestion** — see item 5 above.
- ✅ **Audio lecture ingestion** — see item 6 above.
- ✅ **Web article ingestion** — see item 7 above.
- ✅ **PowerPoint/slide ingestion** — see item 8 above.
- ✅ **Local embeddings (sentence-transformers) as the primary embedding path** — `all-MiniLM-L6-v2` via `HuggingFaceEmbeddings`, replacing Gemini's `gemini-embedding-001` as the default. Same reasoning as the earlier local-reranking decision: removes API cost/latency/rate-limit risk from a component that runs on every single document upload, not just chat. Triggered by repeatedly hitting Gemini's free-tier `RESOURCE_EXHAUSTED` quota during heavy testing — confirmed this wasn't a key-rotation bug (rotation across separate Google Cloud projects still hit the same wall, likely an account-level free-tier ceiling) before migrating. `GoogleGenerativeAIEmbeddings` kept in `embeddings.py` as a secondary/fallback option, not deleted. Required a full Chroma + Postgres wipe (`TRUNCATE ... RESTART IDENTITY CASCADE`) since vectors from different embedding models aren't compatible within the same collection — clean re-test confirmed PDF/YouTube/web/PPTX all working correctly post-migration.
- ✅ **Cheat sheet generation** — see item 12 above.
- ✅ **[NEW] Many-to-many document associations for generated content** — added `quiz_documents`, `study_plan_documents`, `cheat_sheet_documents`, and `mind_map_documents` association tables (plain `Table()` objects, not mapped classes, since they hold no data beyond the two foreign keys), replacing the originally-planned JSON-string `document_ids` approach. Closed a real gap: `Quiz` and `StudyPlan` previously had no way to trace which documents they were generated from, despite their generation requests already requiring `document_ids`. Repository functions for cheat sheets, quiz, and study plan all updated to pass `documents=[...]` when constructing the parent object (caught and fixed a bug where `documents` was mistakenly attached to `QuizQuestion` instead of `Quiz`). Corresponding response schemas (`CheatSheetResponse`, `QuizResponse`, `StudyPlanResponse`, `MindMapResponse`) all use a `model_validator(mode='before')` to transform the ORM object — extracting `document_ids` from the `documents` relationship — before Pydantic's per-field validation runs.

## Prioritization Notes (as of last discussion)

- **Retrieval-quality checklist is now fully closed out** — `k`, chunk tuning, multi-query, hybrid search, reranking, `where_document` filtering, HNSW tuning, and cosine distance are all complete.
- **All planned ingestion sources for this push are complete**: PDF, YouTube, audio, web article, and PPTX.
- **Cheat sheets complete; mind maps deliberately parked** — see item 11 for reasoning. Schema/migration groundwork is already done if revisited later.
- **Remaining backlog is genuinely lower-priority / speculative** and out of scope for the end-of-August target: handwritten notes OCR (#9), multimodal document understanding (#10), mind maps (#11, parked), podcast-style summaries (#13), spaced repetition (#14), cross-document study plans informed by quiz performance (#15).
- **Immediate next steps before frontend work begins:** retest quiz and study plan generation end-to-end now that the `documents=documents` fixes are in (only cheat sheets confirmed working so far); confirm `alembic upgrade head` is fully applied after the recent round of model changes; then a README pass and project overview refresh.