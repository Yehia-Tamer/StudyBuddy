import { useEffect, useState } from 'react';
import { getDocuments, deleteDocument } from '../api/documents';
import AppShell from '../components/layout/AppShell';
import styles from './Documents.module.css';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      setError('');
      try {
        const data = await getDocuments();
        if (!cancelled) setDocuments(data);
      } catch {
        if (!cancelled) setError('Could not load your documents.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(documentId) {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(documentId);
    try {
      await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch {
      setError('Could not delete that document. Try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Your library</p>
          <h1 className={styles.title}>Documents</h1>
        </header>

        {error && <div className={styles.error}>{error}</div>}

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
              Upload a PDF, slide deck, audio lecture, YouTube video, or web article to get started.
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
                  {doc.page_count != null ? `${doc.page_count} pages` : 'No page count'}
                  {' · '}
                  {new Date(doc.upload_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}