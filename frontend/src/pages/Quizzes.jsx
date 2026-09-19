import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import {
  generateQuiz,
  getQuizzes,
  gradeQuiz,
  deleteQuiz,
} from "../api/quizzes";
import { getDocuments } from "../api/documents";
import styles from "./Quizzes.module.css";

const DIFFICULTIES = ["easy", "medium", "hard"];

export default function Quizzes() {
  const [view, setView] = useState("generate");

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  const [libraryQuizzes, setLibraryQuizzes] = useState(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);

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

  const scorePct =
    gradeResult && gradeResult.total
      ? Math.round((gradeResult.score / gradeResult.total) * 100)
      : 0;

  return (
    <AppShell>
      <div className={styles.page}>
        <PageHeader
          eyebrow="Test your knowledge"
          title="Quizzes"
          subtitle="Generate a graded quiz from your material, take it, and see where you stand."
        />

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

        {error && (
          <div className={styles.error}>
            <Icon name="x" size={16} />
            <span>{error}</span>
          </div>
        )}

        {!activeQuiz && view === "generate" && (
          <>
            {!docsLoading && documents.length > 0 && (
              <section className={styles.generatePanel}>
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
                      {selectedDocIds.includes(doc.id) && (
                        <Icon name="check" size={14} />
                      )}
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
                          ? `${styles.pill} ${styles.pillActive}`
                          : styles.pill
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
                    <Icon name="sparkle" size={16} />
                    {generating ? "Generating…" : "Generate quiz"}
                  </button>
                </div>
              </section>
            )}

            {!docsLoading && documents.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>
                  <Icon name="documents" size={24} />
                </span>
                <p className={styles.emptyTitle}>Upload a document first</p>
                <p className={styles.emptyDetail}>
                  Quizzes are generated from documents you have uploaded.
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
                  <span className={styles.emptyIcon}>
                    <Icon name="quizzes" size={24} />
                  </span>
                  <p className={styles.emptyTitle}>No quizzes yet</p>
                  <p className={styles.emptyDetail}>
                    Switch to Generate to create your first one.
                  </p>
                </div>
              )}

            {!libraryLoading &&
              libraryQuizzes !== null &&
              libraryQuizzes.length > 0 && (
                <div className={styles.list}>
                  {libraryQuizzes.map((quiz, index) => (
                    <div
                      key={quiz.id}
                      className={styles.row}
                      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
                    >
                      <button
                        type="button"
                        className={styles.rowMain}
                        onClick={() => handleOpenQuiz(quiz)}
                      >
                        <span className={styles.rowIcon}>
                          <Icon name="quizzes" size={18} />
                        </span>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>{quiz.topic}</span>
                          <span className={styles.rowMeta}>
                            <span className={styles.tag}>{quiz.difficulty}</span>
                            <span className="tnum">
                              {quiz.question_count} questions ·{" "}
                              {quiz.time_estimate_minutes} min
                            </span>
                          </span>
                        </span>
                        <Icon
                          name="chevronRight"
                          size={16}
                          className={styles.rowChevron}
                        />
                      </button>
                      <button
                        type="button"
                        className={styles.rowDelete}
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        disabled={deletingId === quiz.id}
                        aria-label="Delete quiz"
                      >
                        <Icon name="trash" size={16} />
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
                <Icon name="arrowLeft" size={17} />
              </button>
              <div className={styles.quizPanelText}>
                <h2 className={styles.quizPanelTitle}>{activeQuiz.topic}</h2>
                <p className={`${styles.quizPanelMeta} tnum`}>
                  <span className={styles.tag}>{activeQuiz.difficulty}</span>
                  {activeQuiz.question_count} questions ·{" "}
                  {activeQuiz.time_estimate_minutes} min
                </p>
              </div>
            </div>

            {gradeResult && (
              <div className={styles.scoreBanner}>
                <div className={styles.scoreTop}>
                  <div>
                    <span className={`${styles.scoreValue} tnum`}>
                      {gradeResult.score}
                      <span className={styles.scoreTotal}>
                        /{gradeResult.total}
                      </span>
                    </span>
                    <span className={styles.scoreLabel}>correct</span>
                  </div>
                  <span className={`${styles.scorePct} tnum`}>{scorePct}%</span>
                </div>
                <div className={styles.scoreTrack}>
                  <div
                    className={styles.scoreFill}
                    style={{ width: `${scorePct}%` }}
                  />
                </div>
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
                          <Icon
                            name={result.correct ? "check" : "x"}
                            size={13}
                          />
                          {result.correct ? "Correct" : "Not quite"}
                        </span>
                      )}
                    </div>

                    <p className={styles.questionPrompt}>
                      <span className={styles.questionNum}>{index + 1}.</span>{" "}
                      {question.question}
                    </p>

                    {question.type === "true_false" ? (
                      <div className={styles.optionRow}>
                        {["True", "False"].map((option) => {
                          const selected = answers[question.id] === option;
                          return (
                            <label
                              key={option}
                              className={
                                selected
                                  ? `${styles.option} ${styles.optionActive}`
                                  : styles.option
                              }
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={selected}
                                onChange={() =>
                                  updateAnswer(question.id, option)
                                }
                                disabled={!!gradeResult}
                                className={styles.radioNative}
                              />
                              <span className={styles.radioDot} />
                              {option}
                            </label>
                          );
                        })}
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
                      <div
                        className={
                          result.correct
                            ? `${styles.feedbackBlock} ${styles.feedbackCorrect}`
                            : `${styles.feedbackBlock} ${styles.feedbackIncorrect}`
                        }
                      >
                        <p className={styles.feedbackDetail}>
                          {result.feedback}
                        </p>
                        {!result.correct && (
                          <p className={styles.correctAnswer}>
                            Answer: {result.correct_answer}
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
