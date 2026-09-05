
import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { getDocuments } from '../api/documents';
import {
  createConversation,
  deleteConversation,
  getConversations,
  getMessages,
  sendMessage,
} from '../api/chat';
import styles from './Chat.module.css';
import Markdown from '../components/Markdown';

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

function conversationTitle(convo, documents) {
  if (!convo.document_id) return 'General chat';
  return documents.find((d) => d.id === convo.document_id)?.filename || 'Document chat';
}

export default function Chat() {
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [view, setView] = useState('generate'); // 'generate' | 'list'

  const [conversation, setConversation] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null); // used only before a chat starts
  const [restoring, setRestoring] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [conversationList, setConversationList] = useState(null); // null = not fetched yet
  const [listLoading, setListLoading] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [deletingConvoId, setDeletingConvoId] = useState(null);

  const [sendElapsed, setSendElapsed] = useState(0);
  const abortControllerRef = useRef(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Load documents for the picker + for labeling conversations by document
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

  useEffect(() => {
  if (!sending) {
    setSendElapsed(0);
    return;
  }
  const interval = setInterval(() => {
    setSendElapsed((prev) => prev + 1);
  }, 1000);
  return () => clearInterval(interval);
  }, [sending]);

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

  async function loadConversationList() {
    setListLoading(true);
    setError('');

    try {
      const data = await getConversations();
      setConversationList(data);
    } catch {
      setError('Could not load your chat history.');
    } finally {
      setListLoading(false);
    }
  }

  function switchToList() {
    setView('list');

    if (conversationList === null) {
      loadConversationList();
    }
  }

  function switchToGenerate() {
    setView('generate');
  }

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

      // keep "My chats" in sync if it's already been loaded this visit
      setConversationList((prev) => (prev ? [convo, ...prev] : prev));
    } catch {
      setError('Could not start a new chat. Try again.');
    }
  }

  function handleBackFromChat() {
    // Leaves the conversation view only — the chat itself is NOT deleted.
    // Deleting a chat is only ever done explicitly from "My chats".
    localStorage.removeItem(CONVO_STORAGE_KEY);
    localStorage.removeItem(DOC_STORAGE_KEY);

    setConversation(null);
    setMessages([]);
    setSelectedDocId(null);
    setError('');
  }

  async function handleOpenConversation(convo) {
    setError('');
    setOpeningId(convo.id);

    try {
      const history = await getMessages(convo.id);

      setConversation(convo);
      setMessages(history);

      localStorage.setItem(CONVO_STORAGE_KEY, convo.id);

      if (convo.document_id) {
        localStorage.setItem(DOC_STORAGE_KEY, convo.document_id);
      } else {
        localStorage.removeItem(DOC_STORAGE_KEY);
      }
    } catch {
      setError('Could not open that chat.');
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDeleteConversation(convoId) {
    if (!window.confirm('Delete this chat? This cannot be undone.')) return;

    setDeletingConvoId(convoId);
    setError('');

    try {
      await deleteConversation(convoId);

      setConversationList((prev) =>
        prev ? prev.filter((c) => c.id !== convoId) : prev
      );

      if (conversation?.id === convoId) {
        localStorage.removeItem(CONVO_STORAGE_KEY);
        localStorage.removeItem(DOC_STORAGE_KEY);
        setConversation(null);
        setMessages([]);
      }
    } catch {
      setError('Could not delete that chat. Try again.');
    } finally {
      setDeletingConvoId(null);
    }
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setSending(true);
setError('');

const controller = new AbortController();
abortControllerRef.current = controller;

try {
  const assistantMessage = await sendMessage(conversation.id, content, controller.signal);
  setMessages((prev) => [...prev, assistantMessage]);
} catch (err) {
  if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
    setError('Cancelled. Note: the assistant may still finish generating on the server even though you stopped waiting for it.');
  } else {
    setError('The assistant could not respond. Your message was sent — try asking again.');
  }
} finally {
  setSending(false);
  abortControllerRef.current = null;
}
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function handleCancelSend() {
  abortControllerRef.current?.abort();
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
          <div className={styles.tabs}>
            <button
              type="button"
              className={
                view === 'generate'
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
                view === 'list'
                  ? `${styles.tab} ${styles.tabActive}`
                  : styles.tab
              }
              onClick={switchToList}
            >
              My chats
            </button>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!conversation && view === 'generate' && (
          <div className={styles.setup}>
            <p className={styles.eyebrow}>Ask your material</p>
            <h1 className={styles.title}>Chat</h1>

            <p className={styles.setupHint}>
              Chat about one document, or start a general chat across everything you've uploaded.
            </p>

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

            <button
              type="button"
              className={styles.startButton}
              onClick={handleStartChat}
            >
              Start chat
            </button>
          </div>
        )}

        {!conversation && view === 'list' && (
          <div className={styles.convoList}>
            {listLoading && (
              <>
                <div className={styles.skeletonRow} />
                <div className={styles.skeletonRow} />
                <div className={styles.skeletonRow} />
              </>
            )}

            {!listLoading &&
              conversationList !== null &&
              conversationList.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No chats yet</p>
                  <p className={styles.emptyDetail}>
                    Start a chat and it'll show up here.
                  </p>
                </div>
              )}

            {!listLoading &&
              conversationList !== null &&
              conversationList
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                )
                .map((convo, index) => (
                  <div
                    key={convo.id}
                    className={styles.convoRow}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <button
                      type="button"
                      className={styles.convoRowMain}
                      onClick={() => handleOpenConversation(convo)}
                      disabled={openingId === convo.id}
                    >
                      <span className={styles.convoTitle}>
                        {conversationTitle(convo, documents)}
                      </span>

                      <span className={styles.convoDate}>
                        {openingId === convo.id
                          ? 'Opening…'
                          : new Date(convo.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDeleteConversation(convo.id)}
                      disabled={deletingConvoId === convo.id}
                    >
                      {deletingConvoId === convo.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                ))}
          </div>
        )}

        {conversation && (
          <div className={styles.chatShell}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={handleBackFromChat}
                >
                  ← Back
                </button>

                <span className={styles.chatHeaderLabel}>
                  {conversationTitle(conversation, documents)}
                </span>
              </div>
            </div>

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
                    <div className={styles.bubble}>
                      {message.role === 'assistant' ? (
                        <Markdown content={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
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
                            <span
                              key={i}
                              className={styles.sourceChip}
                            >
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
      <div className={styles.sendingRow}>
        {sendElapsed >= 8 && (
          <span className={styles.sendingHint}>Still thinking through your documents…</span>
        )}
        <button type="button" className={styles.cancelSendButton} onClick={handleCancelSend}>
          Cancel
        </button>
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
