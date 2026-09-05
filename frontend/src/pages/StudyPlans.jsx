import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { getDocuments } from '../api/documents';
import {
  generateStudyPlan,
  getStudyPlans,
  deleteStudyPlan,
  updateItemCompletion,
} from '../api/studyPlans';
import styles from './StudyPlans.module.css';

function priorityClass(priority, styles) {
  switch ((priority || '').toLowerCase()) {
    case 'high':
      return styles.priorityHigh;
    case 'medium':
      return styles.priorityMedium;
    case 'low':
      return styles.priorityLow;
    default:
      return styles.priorityMedium;
  }
}

export default function StudyPlans() {
  const [view, setView] = useState('generate'); // 'generate' | 'library'

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [libraryPlans, setLibraryPlans] = useState(null); // null = not fetched yet
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [activePlan, setActivePlan] = useState(null);
  const [togglingItemId, setTogglingItemId] = useState(null);

  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadDocs() {
      setDocsLoading(true);
      try {
        const data = await getDocuments();
        if (!cancelled) setDocuments(data);
      } catch {
        if (!cancelled) setError('Could not load your documents.');
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
    setError('');
    try {
      const data = await getStudyPlans();
      setLibraryPlans(data);
    } catch {
      setError('Could not load your study plans.');
    } finally {
      setLibraryLoading(false);
    }
  }

  function switchToLibrary() {
    setView('library');
    if (libraryPlans === null) loadLibrary();
  }

  function switchToGenerate() {
    setView('generate');
  }

  function toggleDoc(docId) {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }

  async function handleGenerate() {
    if (selectedDocIds.length === 0) {
      setError('Pick at least one document first.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const plan = await generateStudyPlan(selectedDocIds);
      setActivePlan(plan);
      setLibraryPlans((prev) => (prev === null ? null : [plan, ...prev]));
    } catch {
      setError('Could not generate a study plan from those documents.');
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenPlan(plan) {
    setActivePlan(plan);
    setError('');
  }

  function handleBackFromPlan() {
    setActivePlan(null);
  }

  async function handleDeletePlan(planId) {
    if (!window.confirm('Delete this study plan? This cannot be undone.')) return;
    setDeletingId(planId);
    setError('');
    try {
      await deleteStudyPlan(planId);
      setLibraryPlans((prev) => (prev ? prev.filter((p) => p.id !== planId) : prev));
      if (activePlan?.id === planId) setActivePlan(null);
    } catch {
      setError('Could not delete that study plan. Try again.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleItem(itemId, nextCompleted) {
    if (!activePlan) return;
    setTogglingItemId(itemId);
    setError('');
    try {
      const updatedItem = await updateItemCompletion(activePlan.id, itemId, nextCompleted);

      const applyUpdate = (plan) =>
        plan
          ? {
              ...plan,
              items: plan.items.map((item) => (item.id === itemId ? updatedItem : item)),
            }
          : plan;

      setActivePlan((prev) => applyUpdate(prev));
      setLibraryPlans((prev) =>
        prev ? prev.map((p) => (p.id === activePlan.id ? applyUpdate(p) : p)) : prev
      );
    } catch {
      setError('Could not update that item. Try again.');
    } finally {
      setTogglingItemId(null);
    }
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Plan your study time</p>
          <h1 className={styles.title}>Study Plans</h1>
        </header>

        {!activePlan && (
          <div className={styles.tabs}>
            <button
              type="button"
              className={view === 'generate' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={switchToGenerate}
            >
              Generate
            </button>
            <button
              type="button"
              className={view === 'library' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={switchToLibrary}
            >
              My study plans
            </button>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!activePlan && view === 'generate' && (
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

                <button
                  type="button"
                  className={styles.generateButton}
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Generating…' : 'Generate study plan'}
                </button>
              </div>
            )}

            {!docsLoading && documents.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Upload a document first</p>
                <p className={styles.emptyDetail}>
                  Study plans are generated from documents you've uploaded.
                </p>
              </div>
            )}

            {generating && <div className={styles.skeletonBlock} />}
          </>
        )}

        {!activePlan && view === 'library' && (
          <>
            {libraryLoading && <div className={styles.skeletonBlock} />}

            {!libraryLoading && libraryPlans !== null && libraryPlans.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>No study plans yet</p>
                <p className={styles.emptyDetail}>Switch to Generate to create your first one.</p>
              </div>
            )}

            {!libraryLoading && libraryPlans !== null && libraryPlans.length > 0 && (
              <div className={styles.planList}>
                {libraryPlans.map((plan, index) => {
                  const doneCount = plan.items.filter((i) => i.completed).length;
                  return (
                    <div
                      key={plan.id}
                      className={styles.planRow}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <button
                        type="button"
                        className={styles.planRowMain}
                        onClick={() => handleOpenPlan(plan)}
                      >
                        <span className={styles.planTitle}>{plan.title}</span>
                        <span className={styles.planMeta}>
                          {doneCount} / {plan.items.length} completed ·{' '}
                          {new Date(plan.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={deletingId === plan.id}
                      >
                        {deletingId === plan.id ? 'Deleting…' : 'Delete'}
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
              <button type="button" className={styles.backButton} onClick={handleBackFromPlan}>
                ← Back
              </button>
              <div>
                <h2 className={styles.planPanelTitle}>{activePlan.title}</h2>
                <p className={styles.planPanelMeta}>
                  {activePlan.items.filter((i) => i.completed).length} / {activePlan.items.length}{' '}
                  completed
                </p>
              </div>
            </div>

            <div className={styles.itemList}>
              {activePlan.items.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemTopRow}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        disabled={togglingItemId === item.id}
                        onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                      />
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
                    <span className={`${styles.priorityBadge} ${priorityClass(item.priority, styles)}`}>
                      {item.priority}
                    </span>
                  </div>

                  <p className={styles.itemMeta}>{item.estimated_time} min</p>

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