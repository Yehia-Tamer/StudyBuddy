import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import {
  getFlashcards,
  generateFlashcards,
  answerFlashcard,
  deleteFlashCard,
} from "../api/flashcards";
import { getDocuments } from "../api/documents";
import styles from "./Flashcards.module.css";

export default function Flashcards() {
  const [view, setView] = useState("generate"); // 'generate' | 'library'

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [sessionCards, setSessionCards] = useState(null); // null = nothing generated yet this visit

  const [libraryCards, setLibraryCards] = useState(null); // null = not fetched yet
  const [libraryLoading, setLibraryLoading] = useState(false);

  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({}); // { [flashcardId]: { value, submitting, result } }

  useEffect(() => {
    let cancelled = false;
    async function loadDocs() {
      setDocsLoading(true);
      try {
        const data = await getDocuments();
        if (!cancelled) setDocuments(data);
      } catch {
        if (!cancelled) setError("Could not load your documents.");
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    }
    loadDocs();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadLibrary() {
    setLibraryLoading(true);
    setError("");
    try {
      const data = await getFlashcards();
      setLibraryCards(data);
    } catch {
      setError("Could not load your flashcard library.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function switchToLibrary() {
    setView("library");
    if (libraryCards === null) loadLibrary();
  }

  function toggleDoc(docId) {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  }

  async function handleGenerate() {
    if (selectedDocIds.length === 0) {
      setError("Pick at least one document first.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const created = await generateFlashcards(selectedDocIds, count);
      setSessionCards(created);
      setAnswers({});
      // keep the library cache in sync so switching tabs shows the new cards too
      setLibraryCards((prev) => (prev === null ? null : [...created, ...prev]));
    } catch {
      setError("Could not generate flashcards from those documents.");
    } finally {
      setGenerating(false);
    }
  }

  function updateAnswerValue(cardId, value) {
    setAnswers((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], value, result: undefined },
    }));
  }

  async function handleCheckAnswer(cardId) {
    const value = answers[cardId]?.value?.trim();
    if (!value) return;

    setAnswers((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], submitting: true },
    }));
    try {
      const result = await answerFlashcard(cardId, value);
      setAnswers((prev) => ({
        ...prev,
        [cardId]: { value, submitting: false, result },
      }));
    } catch {
      setAnswers((prev) => ({
        ...prev,
        [cardId]: { value, submitting: false, result: { error: true } },
      }));
    }
  }

  async function handleDeleteCard(cardId) {
    if (!window.confirm("Delete this flashcard? This cannot be undone."))
      return;

    setDeletingId(cardId);
    setError("");
    try {
      await deleteFlashCard(cardId);
      setSessionCards((prev) =>
        prev ? prev.filter((c) => c.id !== cardId) : prev,
      );
      setLibraryCards((prev) =>
        prev ? prev.filter((c) => c.id !== cardId) : prev,
      );
    } catch {
      setError("Could not delete that flashcard. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function renderCard(card, index) {
    const answerState = answers[card.id] || {};
    return (
      <article
        key={card.id}
        className={styles.card}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <span className={styles.badge}>{card.type}</span>
        <div className={styles.cardTopRow}>
          <span className={styles.badge}>{card.type}</span>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => handleDeleteCard(card.id)}
            disabled={deletingId === card.id}
          >
            {deletingId === card.id ? "Deleting…" : "Delete"}
          </button>
        </div>
        <p className={styles.question}>{card.question}</p>

        <input
          className={styles.answerInput}
          type="text"
          placeholder="Your answer"
          value={answerState.value || ""}
          onChange={(e) => updateAnswerValue(card.id, e.target.value)}
          disabled={answerState.submitting}
        />
        <button
          type="button"
          className={styles.checkButton}
          onClick={() => handleCheckAnswer(card.id)}
          disabled={answerState.submitting || !answerState.value?.trim()}
        >
          {answerState.submitting ? "Checking…" : "Check answer"}
        </button>

        {answerState.result && !answerState.result.error && (
          <div
            className={
              answerState.result.correct
                ? `${styles.feedback} ${styles.feedbackCorrect}`
                : `${styles.feedback} ${styles.feedbackIncorrect}`
            }
          >
            <p className={styles.feedbackVerdict}>
              {answerState.result.correct ? "Correct" : "Not quite"}
            </p>
            <p className={styles.feedbackDetail}>
              {answerState.result.feedback}
            </p>
            {!answerState.result.correct && (
              <p className={styles.correctAnswer}>
                Correct answer: {answerState.result.correct_answer}
              </p>
            )}
          </div>
        )}

        {answerState.result?.error && (
          <p className={styles.feedbackDetail}>
            Could not grade that answer. Try again.
          </p>
        )}
      </article>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Test yourself</p>
          <h1 className={styles.title}>Flashcards</h1>
        </header>

        <div className={styles.tabs}>
          <button
            type="button"
            className={
              view === "generate"
                ? `${styles.tab} ${styles.tabActive}`
                : styles.tab
            }
            onClick={() => setView("generate")}
          >
            Generate
          </button>
          <button
            type="button"
            className={
              view === "library"
                ? `${styles.tab} ${styles.tabActive}`
                : styles.tab
            }
            onClick={switchToLibrary}
          >
            My flashcards
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {view === "generate" && (
          <>
            {!docsLoading && documents.length > 0 && (
              <div className={styles.generatePanel}>
                <p className={styles.generateLabel}>Generate from</p>
                <div className={styles.docChips}>
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className={
                        selectedDocIds.includes(doc.id)
                          ? `${styles.docChip} ${styles.docChipActive}`
                          : styles.docChip
                      }
                      onClick={() => toggleDoc(doc.id)}
                    >
                      {doc.filename}
                    </button>
                  ))}
                </div>
                <div className={styles.generateRow}>
                  <label className={styles.countLabel}>
                    Count
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className={styles.countInput}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.generateButton}
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? "Generating…" : "Generate flashcards"}
                  </button>
                </div>
              </div>
            )}

            {!docsLoading && documents.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Upload a document first</p>
                <p className={styles.emptyDetail}>
                  Flashcards are generated from documents you've uploaded.
                </p>
              </div>
            )}

            {generating && (
              <div className={styles.grid}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={styles.skeletonCard} />
                ))}
              </div>
            )}

            {!generating && sessionCards === null && documents.length > 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Nothing generated yet</p>
                <p className={styles.emptyDetail}>
                  Pick a document above and generate your first set.
                </p>
              </div>
            )}

            {!generating &&
              sessionCards !== null &&
              sessionCards.length > 0 && (
                <>
                  <p className={styles.sessionLabel}>Just generated</p>
                  <div className={styles.grid}>
                    {sessionCards.map((card, index) => renderCard(card, index))}
                  </div>
                </>
              )}
          </>
        )}

        {view === "library" && (
          <>
            {libraryLoading && (
              <div className={styles.grid}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={styles.skeletonCard} />
                ))}
              </div>
            )}

            {!libraryLoading &&
              libraryCards !== null &&
              libraryCards.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No flashcards yet</p>
                  <p className={styles.emptyDetail}>
                    Switch to Generate to create your first set.
                  </p>
                </div>
              )}

            {!libraryLoading &&
              libraryCards !== null &&
              libraryCards.length > 0 && (
                <div className={styles.grid}>
                  {libraryCards.map((card, index) => renderCard(card, index))}
                </div>
              )}
          </>
        )}
      </div>
    </AppShell>
  );
}
