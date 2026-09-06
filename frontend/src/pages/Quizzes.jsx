import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import { getDocuments } from "../api/documents";
import {
  generateQuiz,
  getQuizzes,
  gradeQuiz,
  deleteQuiz,
} from "../api/quizzes";
import styles from "./Quizzes.module.css";

const DIFFICULTIES = ["easy", "medium", "hard"];

export default function Quizzes() {
  const [view, setView] = useState("generate"); // 'generate' | 'library'

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  const [libraryQuizzes, setLibraryQuizzes] = useState(null); // null = not fetched yet
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [activeQuiz, setActiveQuiz] = useState(null); // the quiz currently being taken/reviewed
  const [answers, setAnswers] = useState({}); // { [questionId]: value }
  const [submitting, setSubmitting] = useState(false);
  const [gradeResult, setGradeResult] = useState(null); // { score, total, results }

  const [error, setError] = useState("");

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
      const data = await getQuizzes();
      setLibraryQuizzes(data);
    } catch {
      setError("Could not load your quiz library.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function switchToLibrary() {
    setView("library");
    if (libraryQuizzes === null) loadLibrary();
  }

  function switchToGenerate() {
    setView("generate");
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
      const quiz = await generateQuiz(selectedDocIds, difficulty, count);
      setActiveQuiz(quiz);
      setAnswers({});
      setGradeResult(null);
      setLibraryQuizzes((prev) => (prev === null ? null : [quiz, ...prev]));
    } catch {
      setError("Could not generate a quiz from those documents.");
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenQuiz(quiz) {
    setActiveQuiz(quiz);
    setAnswers({});
    setGradeResult(null);
    setError("");
  }

  function handleBackFromQuiz() {
    setActiveQuiz(null);
    setAnswers({});
    setGradeResult(null);
  }

  function updateAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmitQuiz() {
    if (!activeQuiz) return;
    const orderedAnswers = activeQuiz.questions.map((q) => answers[q.id] || "");

    setSubmitting(true);
    setError("");
    try {
      const result = await gradeQuiz(activeQuiz.id, orderedAnswers);
      setGradeResult(result);
    } catch {
      setError("Could not grade this quiz. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteQuiz(quizId) {
    if (!window.confirm("Delete this quiz? This cannot be undone.")) return;
    setDeletingId(quizId);
    setError("");
    try {
      await deleteQuiz(quizId);
      setLibraryQuizzes((prev) =>
        prev ? prev.filter((q) => q.id !== quizId) : prev,
      );
      if (activeQuiz?.id === quizId) {
        setActiveQuiz(null);
        setAnswers({});
        setGradeResult(null);
      }
    } catch {
      setError("Could not delete that quiz. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const allAnswered =
    activeQuiz &&
    activeQuiz.questions.every((q) => (answers[q.id] || "").trim().length > 0);

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Test your knowledge</p>
          <h1 className={styles.title}>Quizzes</h1>
        </header>

        {!activeQuiz && (
          <div className={styles.tabs}>
            <button
              type="button"
              className={
                view === "generate"
                  ? `${styles.tab} ${styles.tabActive}`
                  : styles.tab
              }
              onClick={switchToGenerate}
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
              My quizzes
            </button>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!activeQuiz && view === "generate" && (
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

                <p className={styles.generateLabel}>Difficulty</p>
                <div className={styles.docChips}>
                  {DIFFICULTIES.map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={
                        difficulty === level
                          ? `${styles.docChip} ${styles.docChipActive}`
                          : styles.docChip
                      }
                      onClick={() => setDifficulty(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>

                <div className={styles.generateRow}>
                  <label className={styles.countLabel}>
                    Questions
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
                    {generating ? "Generating…" : "Generate quiz"}
                  </button>
                </div>
              </div>
            )}

            {!docsLoading && documents.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Upload a document first</p>
                <p className={styles.emptyDetail}>
                  Quizzes are generated from documents you've uploaded.
                </p>
              </div>
            )}

            {generating && <div className={styles.skeletonBlock} />}
          </>
        )}

        {!activeQuiz && view === "library" && (
          <>
            {libraryLoading && <div className={styles.skeletonBlock} />}

            {!libraryLoading &&
              libraryQuizzes !== null &&
              libraryQuizzes.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No quizzes yet</p>
                  <p className={styles.emptyDetail}>
                    Switch to Generate to create your first one.
                  </p>
                </div>
              )}

            {!libraryLoading &&
              libraryQuizzes !== null &&
              libraryQuizzes.length > 0 && (
                <div className={styles.quizList}>
                  {libraryQuizzes.map((quiz, index) => (
                    <div
                      key={quiz.id}
                      className={styles.quizRow}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <button
                        type="button"
                        className={styles.quizRowMain}
                        onClick={() => handleOpenQuiz(quiz)}
                      >
                        <span className={styles.quizTopic}>{quiz.topic}</span>
                        <span className={styles.quizMeta}>
                          {quiz.difficulty} · {quiz.question_count} questions ·{" "}
                          {quiz.time_estimate_minutes} min
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        disabled={deletingId === quiz.id}
                      >
                        {deletingId === quiz.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
          </>
        )}

        {activeQuiz && (
          <div className={styles.quizPanel}>
            <div className={styles.quizPanelHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackFromQuiz}
              >
                ← Back
              </button>
              <div>
                <h2 className={styles.quizPanelTitle}>{activeQuiz.topic}</h2>
                <p className={styles.quizPanelMeta}>
                  {activeQuiz.difficulty} · {activeQuiz.question_count}{" "}
                  questions · {activeQuiz.time_estimate_minutes} min
                </p>
              </div>
            </div>

            {gradeResult && (
              <div className={styles.scoreBanner}>
                <span className={styles.scoreValue}>
                  {gradeResult.score} / {gradeResult.total}
                </span>
                <span className={styles.scoreLabel}>correct</span>
              </div>
            )}

            <div className={styles.questionList}>
              {activeQuiz.questions.map((question, index) => {
                const result = gradeResult?.results?.[index];
                return (
                  <div key={question.id} className={styles.questionCard}>
                    <div className={styles.questionTopRow}>
                      <span className={styles.badge}>{question.type}</span>
                      {result && (
                        <span
                          className={
                            result.correct
                              ? `${styles.verdict} ${styles.verdictCorrect}`
                              : `${styles.verdict} ${styles.verdictIncorrect}`
                          }
                        >
                          {result.correct ? "Correct" : "Not quite"}
                        </span>
                      )}
                    </div>

                    <p className={styles.questionPrompt}>
                      {index + 1}. {question.question}
                    </p>

                    {question.type === "true_false" ? (
                      <div className={styles.radioRow}>
                        {["True", "False"].map((option) => (
                          <label key={option} className={styles.radioOption}>
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              checked={answers[question.id] === option}
                              onChange={() => updateAnswer(question.id, option)}
                              disabled={!!gradeResult}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className={styles.answerInput}
                        placeholder="Your answer"
                        value={answers[question.id] || ""}
                        onChange={(e) =>
                          updateAnswer(question.id, e.target.value)
                        }
                        disabled={!!gradeResult}
                      />
                    )}

                    {result && (
                      <div className={styles.feedbackBlock}>
                        <p className={styles.feedbackDetail}>
                          {result.feedback}
                        </p>
                        {!result.correct && (
                          <p className={styles.correctAnswer}>
                            Correct answer: {result.correct_answer}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!gradeResult && (
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleSubmitQuiz}
                disabled={submitting || !allAnswered}
              >
                {submitting ? "Grading…" : "Submit quiz"}
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
