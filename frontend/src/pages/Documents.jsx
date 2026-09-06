import { useEffect, useState } from "react";
import {
  getDocuments,
  deleteDocument,
  uploadPdfDocument,
  uploadPptxDocument,
  uploadAudioDocument,
  uploadYoutubeDocument,
  uploadWebDocument,
} from "../api/documents";
import AppShell from "../components/layout/AppShell";
import styles from "./Documents.module.css";

const DOCUMENT_TYPES = [
  { value: "pdf", label: "PDF", kind: "file", accept: ".pdf" },
  { value: "pptx", label: "PowerPoint", kind: "file", accept: ".pptx,.ppt" },
  { value: "audio", label: "Audio", kind: "file", accept: "audio/*" },
  {
    value: "youtube",
    label: "YouTube",
    kind: "url",
    placeholder: "Paste a YouTube link",
  },
  {
    value: "web",
    label: "Web Article",
    kind: "url",
    placeholder: "Paste an article URL",
  },
];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [uploadType, setUploadType] = useState("pdf");
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlValue, setUrlValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadElapsed, setUploadElapsed] = useState(0);

  // Load documents when the page mounts
  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      setError("");

      try {
        const data = await getDocuments();

        if (!cancelled) {
          setDocuments(data);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load your documents.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  // Track how long an upload has been running
  useEffect(() => {
    if (!uploading) {
      setUploadElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setUploadElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [uploading]);

  async function handleDelete(documentId) {
    if (!window.confirm("Delete this document? This cannot be undone.")) {
      return;
    }

    setDeletingId(documentId);

    try {
      await deleteDocument(documentId);

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch {
      setError("Could not delete that document. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleTypeChange(type) {
    setUploadType(type);
    setSelectedFile(null);
    setUrlValue("");
    setError("");
    setFileInputKey((prev) => prev + 1);
  }

  async function handleUpload() {
    const activeType = DOCUMENT_TYPES.find((t) => t.value === uploadType);

    if (!activeType) return;

    if (activeType.kind === "file" && !selectedFile) {
      return;
    }

    if (activeType.kind === "url" && !urlValue.trim()) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      let newDocument;

      switch (uploadType) {
        case "pdf":
          newDocument = await uploadPdfDocument(selectedFile);
          break;

        case "pptx":
          newDocument = await uploadPptxDocument(selectedFile);
          break;

        case "audio":
          newDocument = await uploadAudioDocument(selectedFile);
          break;

        case "youtube":
          newDocument = await uploadYoutubeDocument(urlValue.trim());
          break;

        case "web":
          newDocument = await uploadWebDocument(urlValue.trim());
          break;

        default:
          return;
      }

      setDocuments((prev) => [newDocument, ...prev]);
      setSelectedFile(null);
      setUrlValue("");
      setFileInputKey((prev) => prev + 1);
    } catch {
      setError("Could not upload that document. Try again.");
    } finally {
      setUploading(false);
    }
  }

  const activeType = DOCUMENT_TYPES.find((t) => t.value === uploadType);

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Your library</p>
          <h1 className={styles.title}>Documents</h1>
        </header>

        {error && (
          <div className={styles.error}>
            {error}{" "}
            <button
              type="button"
              className={styles.retryLink}
              onClick={handleUpload}
            >
              Try again
            </button>
          </div>
        )}

        <div className={styles.generatePanel}>
          <p className={styles.generateLabel}>Upload a document</p>

          <div className={styles.docChips}>
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={
                  uploadType === type.value
                    ? `${styles.docChip} ${styles.docChipActive}`
                    : styles.docChip
                }
                onClick={() => handleTypeChange(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className={styles.generateRow}>
            {activeType.kind === "file" ? (
              <input
                key={fileInputKey}
                type="file"
                accept={activeType.accept}
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className={styles.fileInput}
              />
            ) : (
              <input
                type="text"
                placeholder={activeType.placeholder}
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                className={styles.urlInput}
              />
            )}

            <button
              type="button"
              className={styles.generateButton}
              onClick={handleUpload}
              disabled={
                uploading ||
                (activeType.kind === "file" ? !selectedFile : !urlValue.trim())
              }
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>

            {uploading && uploadElapsed >= 8 && (
              <p className={styles.uploadHint}>
                {uploadType === "audio"
                  ? "Transcribing audio can take a minute or two for longer recordings…"
                  : "Still working — larger files or slower connections can take a bit…"}
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className={styles.grid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {!loading && documents.length === 0 && !error && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No documents yet</p>

            <p className={styles.emptyDetail}>
              Upload a PDF, slide deck, audio lecture, YouTube video, or web
              article to get started.
            </p>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className={styles.grid}>
            {documents.map((doc, index) => (
              <article
                key={doc.id}
                className={styles.card}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className={styles.filename}>{doc.filename}</p>

                <span className={styles.badge}>{doc.source_type}</span>

                <p className={styles.meta}>
                  {doc.page_count != null
                    ? `${doc.page_count} pages`
                    : "No page count"}
                  {" · "}
                  {new Date(doc.upload_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? "Deleting…" : "Delete"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
