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
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import styles from "./Documents.module.css";

const DOCUMENT_TYPES = [
  { value: "pdf", label: "PDF", kind: "file", accept: ".pdf", icon: "file" },
  {
    value: "pptx",
    label: "PowerPoint",
    kind: "file",
    accept: ".pptx,.ppt",
    icon: "presentation",
  },
  { value: "audio", label: "Audio", kind: "file", accept: "audio/*", icon: "audio" },
  {
    value: "youtube",
    label: "YouTube",
    kind: "url",
    placeholder: "Paste a YouTube link",
    icon: "video",
  },
  {
    value: "web",
    label: "Web article",
    kind: "url",
    placeholder: "Paste an article URL",
    icon: "web",
  },
];

const TYPE_META = {
  pdf: { icon: "file", label: "PDF" },
  pptx: { icon: "presentation", label: "Slides" },
  audio: { icon: "audio", label: "Audio" },
  youtube: { icon: "video", label: "YouTube" },
  web: { icon: "web", label: "Web" },
};

function typeMeta(sourceType) {
  return TYPE_META[sourceType] || { icon: "file", label: sourceType };
}

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

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      setError("");
      try {
        const data = await getDocuments();
        if (!cancelled) setDocuments(data);
      } catch {
        if (!cancelled) setError("Could not load your documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!window.confirm("Delete this document? This cannot be undone.")) return;

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
    if (activeType.kind === "file" && !selectedFile) return;
    if (activeType.kind === "url" && !urlValue.trim()) return;

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
  const canUpload =
    !uploading &&
    (activeType.kind === "file" ? !!selectedFile : !!urlValue.trim());

  return (
    <AppShell>
      <div className={styles.page}>
        <PageHeader
          eyebrow="Your library"
          title="Documents"
          subtitle="Everything you upload becomes study material StudyBuddy can chat about, quiz you on, and summarize."
        />

        {error && (
          <div className={styles.error}>
            <Icon name="x" size={16} />
            <span>{error}</span>
          </div>
        )}

        <section className={styles.uploadPanel}>
          <div className={styles.uploadHeadRow}>
            <span className={styles.uploadIcon}>
              <Icon name="upload" size={18} />
            </span>
            <div>
              <p className={styles.uploadTitle}>Add to your library</p>
              <p className={styles.uploadHelp}>
                Upload a file or paste a link. StudyBuddy indexes it so answers
                stay grounded in your material.
              </p>
            </div>
          </div>

          <div className={styles.typeChips}>
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={
                  uploadType === type.value
                    ? `${styles.typeChip} ${styles.typeChipActive}`
                    : styles.typeChip
                }
                onClick={() => handleTypeChange(type.value)}
              >
                <Icon name={type.icon} size={16} />
                {type.label}
              </button>
            ))}
          </div>

          <div className={styles.uploadRow}>
            {activeType.kind === "file" ? (
              <label className={styles.fileField}>
                <input
                  key={fileInputKey}
                  type="file"
                  accept={activeType.accept}
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className={styles.fileNative}
                />
                <span className={styles.fileChoose}>
                  <Icon name="upload" size={16} />
                  Choose file
                </span>
                <span
                  className={
                    selectedFile
                      ? `${styles.fileName} ${styles.fileNameSet}`
                      : styles.fileName
                  }
                >
                  {selectedFile ? selectedFile.name : "No file selected"}
                </span>
              </label>
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
              className={styles.uploadButton}
              onClick={handleUpload}
              disabled={!canUpload}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>

          {uploading && uploadElapsed >= 8 && (
            <p className={styles.uploadNote}>
              {uploadType === "audio"
                ? "Transcribing audio can take a minute or two for longer recordings."
                : "Still working. Larger files or slower connections can take a bit."}
            </p>
          )}
        </section>

        <div className={styles.libraryHead}>
          <h2 className={styles.libraryTitle}>Library</h2>
          {!loading && documents.length > 0 && (
            <span className={styles.count}>
              {documents.length} {documents.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>

        {loading && (
          <div className={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {!loading && documents.length === 0 && !error && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Icon name="documents" size={26} />
            </span>
            <p className={styles.emptyTitle}>No documents yet</p>
            <p className={styles.emptyDetail}>
              Upload a PDF, slide deck, audio lecture, YouTube video, or web
              article to get started.
            </p>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className={styles.grid}>
            {documents.map((doc, index) => {
              const meta = typeMeta(doc.source_type);
              return (
                <article
                  key={doc.id}
                  className={styles.card}
                  style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                >
                  <div className={styles.cardHead}>
                    <span
                      className={styles.docIcon}
                      data-type={doc.source_type}
                    >
                      <Icon name={meta.icon} size={20} />
                    </span>
                    <button
                      className={styles.cardDelete}
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      aria-label="Delete document"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>

                  <p className={styles.filename} title={doc.filename}>
                    {doc.filename}
                  </p>

                  <div className={styles.cardMeta}>
                    <span className={styles.badge}>{meta.label}</span>
                    <span className={`${styles.metaText} tnum`}>
                      {doc.page_count != null
                        ? `${doc.page_count} pages`
                        : "No page count"}
                      {" · "}
                      {new Date(doc.upload_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
