import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { getDocuments } from '../api/documents';
import { generateCheatSheet, getCheatSheets, deleteCheatSheet } from '../api/cheatSheets';
import styles from './CheatSheets.module.css';

export default function CheatSheets() {
  const [view, setView] = useState('generate'); // 'generate' | 'library'

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [librarySheets, setLibrarySheets] = useState(null); // null = not fetched yet
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [activeSheet, setActiveSheet] = useState(null);

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
      const data = await getCheatSheets();
      setLibrarySheets(data);
    } catch {
      setError('Could not load your cheat sheets.');
    } finally {
      setLibraryLoading(false);
    }
  }

  function switchToLibrary() {
    setView('library');
    if (librarySheets === null) loadLibrary();
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
      const sheet = await generateCheatSheet(selectedDocIds);
      setActiveSheet(sheet);
      setLibrarySheets((prev) => (prev === null ? null : [sheet, ...prev]));
    } catch {
      setError('Could not generate a cheat sheet from those documents.');
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenSheet(sheet) {
    setActiveSheet(sheet);
    setError('');
  }

  function handleBackFromSheet() {
    setActiveSheet(null);
  }

  async function handleDeleteSheet(sheetId) {
    if (!window.confirm('Delete this cheat sheet? This cannot be undone.')) return;
    setDeletingId(sheetId);
    setError('');
    try {
      await deleteCheatSheet(sheetId);
      setLibrarySheets((prev) => (prev ? prev.filter((s) => s.id !== sheetId) : prev));
      if (activeSheet?.id === sheetId) setActiveSheet(null);
    } catch {
      setError('Could not delete that cheat sheet. Try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>One-page summaries</p>
          <h1 className={styles.title}>Cheat Sheets</h1>
        </header>

        {!activeSheet && (
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
              My cheat sheets
            </button>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!activeSheet && view === 'generate' && (
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
                  {generating ? 'Generating…' : 'Generate cheat sheet'}
                </button>
              </div>
            )}

            {!docsLoading && documents.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Upload a document first</p>
                <p className={styles.emptyDetail}>
                  Cheat sheets are generated from documents you've uploaded.
                </p>
              </div>
            )}

            {generating && <div className={styles.skeletonBlock} />}
          </>
        )}

        {!activeSheet && view === 'library' && (
          <>
            {libraryLoading && <div className={styles.skeletonBlock} />}

            {!libraryLoading && librarySheets !== null && librarySheets.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>No cheat sheets yet</p>
                <p className={styles.emptyDetail}>Switch to Generate to create your first one.</p>
              </div>
            )}

            {!libraryLoading && librarySheets !== null && librarySheets.length > 0 && (
              <div className={styles.sheetList}>
                {librarySheets.map((sheet, index) => (
                  <div
                    key={sheet.id}
                    className={styles.sheetRow}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <button
                      type="button"
                      className={styles.sheetRowMain}
                      onClick={() => handleOpenSheet(sheet)}
                    >
                      <span className={styles.sheetTitleText}>{sheet.title}</span>
                      <span className={styles.sheetMeta}>{sheet.topic}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDeleteSheet(sheet.id)}
                      disabled={deletingId === sheet.id}
                    >
                      {deletingId === sheet.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSheet && (
          <div className={styles.sheetPanel}>
            <div className={styles.sheetPanelHeader}>
              <button type="button" className={styles.backButton} onClick={handleBackFromSheet}>
                ← Back
              </button>
              <div>
                <h2 className={styles.sheetPanelTitle}>{activeSheet.title}</h2>
                <p className={styles.sheetPanelMeta}>{activeSheet.topic}</p>
              </div>
            </div>

            <div className={styles.sheetContent}>{activeSheet.content}</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}