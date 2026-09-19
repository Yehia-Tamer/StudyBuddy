import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import {
  generateCheatSheet,
  getCheatSheets,
  deleteCheatSheet,
} from "../api/cheatSheets";
import Markdown from "../components/Markdown";
import styles from "./CheatSheets.module.css";
import { getDocuments } from "../api/documents";

export default function CheatSheets() {
  const [view, setView] = useState("generate");

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [librarySheets, setLibrarySheets] = useState(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [activeSheet, setActiveSheet] = useState(null);

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
      const data = await getCheatSheets();
      setLibrarySheets(data);
    } catch {
      setError("Could not load your cheat sheets.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function switchToLibrary() {
    setView("library");
    if (librarySheets === null) loadLibrary();
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
      const sheet = await generateCheatSheet(selectedDocIds);
      setActiveSheet(sheet);
      setLibrarySheets((prev) => (prev === null ? null : [sheet, ...prev]));
    } catch {
      setError("Could not generate a cheat sheet from those documents.");
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenSheet(sheet) {
    setActiveSheet(sheet);
    setError("");
  }

  function handleBackFromSheet() {
    setActiveSheet(null);
  }

  async function handleDeleteSheet(sheetId) {
    if (!window.confirm("Delete this cheat sheet? This cannot be undone."))
      return;
    setDeletingId(sheetId);
    setError("");
    try {
      await deleteCheatSheet(sheetId);
      setLibrarySheets((prev) =>
        prev ? prev.filter((s) => s.id !== sheetId) : prev,
      );
      if (activeSheet?.id === sheetId) setActiveSheet(null);
    } catch {
      setError("Could not delete that cheat sheet. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <PageHeader
          eyebrow="One-page summaries"
          title="Cheat sheets"
          subtitle="Condense your material into a single dense reference you can scan before an exam."
        />

        {!activeSheet && (
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
              My cheat sheets
            </button>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <Icon name="x" size={16} />
            <span>{error}</span>
          </div>
        )}

        {!activeSheet && view === "generate" && (
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
                  {generating ? "Generating…" : "Generate cheat sheet"}
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
                  Cheat sheets are generated from documents you have uploaded.
                </p>
              </div>
            )}

            {generating && <div className={styles.skeletonBlock} />}
          </>
        )}

        {!activeSheet && view === "library" && (
          <>
            {libraryLoading && <div className={styles.skeletonBlock} />}

            {!libraryLoading &&
              librarySheets !== null &&
              librarySheets.length === 0 && (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>
                    <Icon name="cheatsheet" size={24} />
                  </span>
                  <p className={styles.emptyTitle}>No cheat sheets yet</p>
                  <p className={styles.emptyDetail}>
                    Switch to Generate to create your first one.
                  </p>
                </div>
              )}

            {!libraryLoading &&
              librarySheets !== null &&
              librarySheets.length > 0 && (
                <div className={styles.list}>
                  {librarySheets.map((sheet, index) => (
                    <div
                      key={sheet.id}
                      className={styles.row}
                      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
                    >
                      <button
                        type="button"
                        className={styles.rowMain}
                        onClick={() => handleOpenSheet(sheet)}
                      >
                        <span className={styles.rowIcon}>
                          <Icon name="cheatsheet" size={18} />
                        </span>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>{sheet.title}</span>
                          <span className={styles.rowMeta}>{sheet.topic}</span>
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
                        onClick={() => handleDeleteSheet(sheet.id)}
                        disabled={deletingId === sheet.id}
                        aria-label="Delete cheat sheet"
                      >
                        <Icon name="trash" size={16} />
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
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackFromSheet}
              >
                <Icon name="arrowLeft" size={17} />
              </button>
              <div className={styles.sheetPanelText}>
                <h2 className={styles.sheetPanelTitle}>{activeSheet.title}</h2>
                <p className={styles.sheetPanelMeta}>{activeSheet.topic}</p>
              </div>
            </div>
            <article className={styles.sheetContent}>
              <Markdown content={activeSheet.content} />
            </article>
          </div>
        )}
      </div>
    </AppShell>
  );
}
