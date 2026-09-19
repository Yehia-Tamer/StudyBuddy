import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import {
  generateStudyPlan,
  getStudyPlans,
  deleteStudyPlan,
  updateItemCompletion,
} from "../api/studyPlans";
import { getDocuments } from "../api/documents";
import styles from "./StudyPlans.module.css";

function priorityClass(priority, styles) {
  switch ((priority || "").toLowerCase()) {
    case "high":
      return styles.priorityHigh;
    case "medium":
      return styles.priorityMedium;
    case "low":
      return styles.priorityLow;
    default:
      return styles.priorityMedium;
  }
}

export default function StudyPlans() {
  const [view, setView] = useState("generate");

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [libraryPlans, setLibraryPlans] = useState(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [activePlan, setActivePlan] = useState(null);
  const [togglingItemId, setTogglingItemId] = useState(null);

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
      const data = await getStudyPlans();
      setLibraryPlans(data);
    } catch {
      setError("Could not load your study plans.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function switchToLibrary() {
    setView("library");
    if (libraryPlans === null) loadLibrary();
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
      const plan = await generateStudyPlan(selectedDocIds);
      setActivePlan(plan);
      setLibraryPlans((prev) => (prev === null ? null : [plan, ...prev]));
    } catch {
      setError("Could not generate a study plan from those documents.");
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenPlan(plan) {
    setActivePlan(plan);
    setError("");
  }

  function handleBackFromPlan() {
    setActivePlan(null);
  }

  async function handleDeletePlan(planId) {
    if (!window.confirm("Delete this study plan? This cannot be undone."))
      return;
    setDeletingId(planId);
    setError("");
    try {
      await deleteStudyPlan(planId);
      setLibraryPlans((prev) =>
        prev ? prev.filter((p) => p.id !== planId) : prev,
      );
      if (activePlan?.id === planId) setActivePlan(null);
    } catch {
      setError("Could not delete that study plan. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleItem(itemId, nextCompleted) {
    if (!activePlan) return;
    setTogglingItemId(itemId);
    setError("");
    try {
      const updatedItem = await updateItemCompletion(
        activePlan.id,
        itemId,
        nextCompleted,
      );

      const applyUpdate = (plan) =>
        plan
          ? {
              ...plan,
              items: plan.items.map((item) =>
                item.id === itemId ? updatedItem : item,
              ),
            }
          : plan;

      setActivePlan((prev) => applyUpdate(prev));
      setLibraryPlans((prev) =>
        prev
          ? prev.map((p) => (p.id === activePlan.id ? applyUpdate(p) : p))
          : prev,
      );
    } catch {
      setError("Could not update that item. Try again.");
    } finally {
      setTogglingItemId(null);
    }
  }

  const activeDone = activePlan
    ? activePlan.items.filter((i) => i.completed).length
    : 0;
  const activeTotal = activePlan ? activePlan.items.length : 0;
  const activePct = activeTotal
    ? Math.round((activeDone / activeTotal) * 100)
    : 0;

  return (
    <AppShell>
      <div className={styles.page}>
        <PageHeader
          eyebrow="Plan your study time"
          title="Study plans"
          subtitle="Turn your documents into an ordered checklist of topics, priorities, and time estimates."
        />

        {!activePlan && (
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
              My study plans
            </button>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <Icon name="x" size={16} />
            <span>{error}</span>
          </div>
        )}

        {!activePlan && view === "generate" && (
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
                <button
                  type="button"
                  className={styles.generateButton}
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  <Icon name="sparkle" size={16} />
                  {generating ? "Generating…" : "Generate study plan"}
                </button>
              </section>
            )}

            {!docsLoading && documents.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>
                  <Icon name="documents" size={24} />
                </span>
                <p className={styles.emptyTitle}>Upload a document first</p>
                <p className={styles.emptyDetail}>
                  Study plans are generated from documents you have uploaded.
                </p>
              </div>
            )}

            {generating && <div className={styles.skeletonBlock} />}
          </>
        )}

        {!activePlan && view === "library" && (
          <>
            {libraryLoading && <div className={styles.skeletonBlock} />}

            {!libraryLoading &&
              libraryPlans !== null &&
              libraryPlans.length === 0 && (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>
                    <Icon name="plans" size={24} />
                  </span>
                  <p className={styles.emptyTitle}>No study plans yet</p>
                  <p className={styles.emptyDetail}>
                    Switch to Generate to create your first one.
                  </p>
                </div>
              )}

            {!libraryLoading &&
              libraryPlans !== null &&
              libraryPlans.length > 0 && (
                <div className={styles.list}>
                  {libraryPlans.map((plan, index) => {
                    const doneCount = plan.items.filter(
                      (i) => i.completed,
                    ).length;
                    const total = plan.items.length;
                    const pct = total
                      ? Math.round((doneCount / total) * 100)
                      : 0;
                    return (
                      <div
                        key={plan.id}
                        className={styles.row}
                        style={{
                          animationDelay: `${Math.min(index, 10) * 40}ms`,
                        }}
                      >
                        <button
                          type="button"
                          className={styles.rowMain}
                          onClick={() => handleOpenPlan(plan)}
                        >
                          <span className={styles.rowIcon}>
                            <Icon name="plans" size={18} />
                          </span>
                          <span className={styles.rowText}>
                            <span className={styles.rowTitle}>{plan.title}</span>
                            <span className={styles.rowProgress}>
                              <span className={styles.rowTrack}>
                                <span
                                  className={styles.rowFill}
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                              <span className={`${styles.rowMeta} tnum`}>
                                {doneCount}/{total} done
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
                          onClick={() => handleDeletePlan(plan.id)}
                          disabled={deletingId === plan.id}
                          aria-label="Delete study plan"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
          </>
        )}

        {activePlan && (
          <div className={styles.planPanel}>
            <div className={styles.planPanelHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackFromPlan}
              >
                <Icon name="arrowLeft" size={17} />
              </button>
              <div className={styles.planPanelText}>
                <h2 className={styles.planPanelTitle}>{activePlan.title}</h2>
                <p className={`${styles.planPanelMeta} tnum`}>
                  {activeDone} of {activeTotal} completed
                </p>
              </div>
              <div className={styles.progressRing}>
                <span className="tnum">{activePct}%</span>
              </div>
            </div>

            <div className={styles.planTrack}>
              <div
                className={styles.planFill}
                style={{ width: `${activePct}%` }}
              />
            </div>

            <div className={styles.itemList}>
              {activePlan.items.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.completed
                      ? `${styles.itemCard} ${styles.itemCardDone}`
                      : styles.itemCard
                  }
                >
                  <div className={styles.itemTop}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        disabled={togglingItemId === item.id}
                        onChange={(e) =>
                          handleToggleItem(item.id, e.target.checked)
                        }
                        className={styles.checkNative}
                      />
                      <span className={styles.checkBox}>
                        <Icon name="check" size={13} />
                      </span>
                      <span
                        className={
                          item.completed
                            ? `${styles.itemTopic} ${styles.itemTopicDone}`
                            : styles.itemTopic
                        }
                      >
                        {item.topic}
                      </span>
                    </label>
                    <span
                      className={`${styles.priorityBadge} ${priorityClass(item.priority, styles)}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <p className={`${styles.itemMeta} tnum`}>
                    <Icon name="clock" size={14} />
                    {item.estimated_time} min
                  </p>

                  {item.subtopics && item.subtopics.length > 0 && (
                    <ul className={styles.subtopicList}>
                      {item.subtopics.map((sub, i) => (
                        <li key={i}>{sub}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
