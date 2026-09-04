
import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { getDocuments } from '../api/documents';
import { createConversation, deleteConversation, getMessages, sendMessage } from '../api/chat';
import styles from './Chat.module.css';

const CONVO_STORAGE_KEY = 'chat_conversation_id';
const DOC_STORAGE_KEY = 'chat_document_id';

function sourceLabel(source) {
  switch (source.source_type) {
    case 'pdf':
      return `📄 ${source.filename || 'PDF'}${source.page ? ` — p. ${source.page}` : ''}`;
    case 'pptx':
      return `🖥️ Slide ${source.slide}`;
    case 'youtube':
      return `▶️ YouTube @ ${source.timestamp_delay}`;
    case 'audio':
      return `🎧 ${source.filename || 'Audio'} @ ${source.timestamp_delay}`;
    case 'web':
      return '🔗 Web source';
    default:
      return source.source_type;
  }
}

function sourceHref(source) {
  return source.link || source.source_url || null;
}

export default function Chat() {
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [conversation, setConversation] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null); // used only before a chat starts
  const [restoring, setRestoring] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Load documents for the picker
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

  // Try to restore a conversation from a previous visit
  useEffect(() => {
    const storedId = localStorage.getItem(CONVO_STORAGE_KEY);
    const storedDocId = localStorage.getItem(DOC_STORAGE_KEY);

    if (!storedId) {
      setRestoring(false);
      return;
    }

    let cancelled = false;
    async function restore() {
      try {
        const history = await getMessages(storedId);
        if (cancelled) return;
        setConversation({
          id: Number(storedId),
          document_id: storedDocId ? Number(storedDocId) : null,
        });
        setMessages(history);
      } catch {
        // conversation no longer exists — clear stale storage and start fresh
        localStorage.removeItem(CONVO_STORAGE_KEY);
        localStorage.removeItem(DOC_STORAGE_KEY);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll on new messages / typing indicator
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleStartChat() {
    setError('');
    try {
      const docId = selectedDocId || null;
      const convo = await createConversation(docId);
      setConversation(convo);
      setMessages([]);
      localStorage.setItem(CONVO_STORAGE_KEY, convo.id);
      if (docId) {
        localStorage.setItem(DOC_STORAGE_KEY, docId);
      } else {
        localStorage.removeItem(DOC_STORAGE_KEY);
      }
    } catch {
      setError('Could not start a new chat. Try again.');
    }
  }

  async function handleNewChat() {
    if (conversation) {
      try {
        await deleteConversation(conversation.id);
      } catch {
        // if it's already gone server-side, that's fine — we're resetting anyway
      }
    }
    localStorage.removeItem(CONVO_STORAGE_KEY);
    localStorage.removeItem(DOC_STORAGE_KEY);
    setConversation(null);
    setMessages([]);
    setSelectedDocId(null);
    setError('');
  }

  async function handleSend(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || !conversation) return;

    const optimisticUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      sources: [],
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setSending(true);
    setError('');

    try {
      const assistantMessage = await sendMessage(conversation.id, content);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError('The assistant could not respond. Your message was sent — try asking again.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }

  if (restoring) {
    return (
      <AppShell>
        <div className={styles.page} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        {!conversation && (
          <div className={styles.setup}>
            <p className={styles.eyebrow}>Ask your material</p>
            <h1 className={styles.title}>Chat</h1>
            <p className={styles.setupHint}>
              Chat about one document, or start a general chat across everything you've uploaded.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            {!docsLoading && (
              <div className={styles.docChips}>
                <button
                  type="button"
                  className={
                    selectedDocId === null
                      ? `${styles.docChip} ${styles.docChipActive}`
                      : styles.docChip
                  }
                  onClick={() => setSelectedDocId(null)}
                >
                  General (all context)
                </button>

                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    className={
                      selectedDocId === doc.id
                        ? `${styles.docChip} ${styles.docChipActive}`
                        : styles.docChip
                    }
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    {doc.filename}
                  </button>
                ))}
              </div>
            )}

            <button type="button" className={styles.startButton} onClick={handleStartChat}>
              Start chat
            </button>
          </div>
        )}

        {conversation && (
          <div className={styles.chatShell}>
            <div className={styles.chatHeader}>
              <span className={styles.chatHeaderLabel}>
                {conversation.document_id
                  ? documents.find((d) => d.id === conversation.document_id)?.filename ||
                    'Document chat'
                  : 'General chat'}
              </span>

              <button type="button" className={styles.newChatButton} onClick={handleNewChat}>
                New chat
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.messages}>
              {messages.length === 0 && (
                <div className={styles.emptyThread}>
                  <p className={styles.emptyTitle}>Ask anything</p>
                  <p className={styles.emptyDetail}>
                    Ask a question about your material and I'll answer using it directly.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? `${styles.message} ${styles.messageUser}`
                      : `${styles.message} ${styles.messageAssistant}`
                  }
                >
                  {message.role === 'assistant' && (
                    <div className={styles.avatar}>SB</div>
                  )}

                  <div className={styles.bubbleColumn}>
                    <div className={styles.bubble}>{message.content}</div>

                    {message.sources && message.sources.length > 0 && (
                      <div className={styles.sources}>
                        {message.sources.map((source, i) => {
                          const href = sourceHref(source);

                          return href ? (
                            <a
                              key={i}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.sourceChip}
                            >
                              {sourceLabel(source)}
                            </a>
                          ) : (
                            <span key={i} className={styles.sourceChip}>
                              {sourceLabel(source)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className={`${styles.message} ${styles.messageAssistant}`}>
                  <div className={styles.avatar}>SB</div>
                  <div className={styles.bubbleColumn}>
                    <div className={`${styles.bubble} ${styles.typingBubble}`}>
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form className={styles.inputBar} onSubmit={handleSend}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="Ask a question…"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />

              <button
                type="submit"
                className={styles.sendButton}
                disabled={sending || !input.trim()}
              >
                {sending ? '…' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}

