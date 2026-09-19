import { useEffect, useRef, useState } from "react";
import AppShell from "../components/layout/AppShell";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import Markdown from "../components/Markdown";
import { getDocuments } from "../api/documents";
import {
  createConversation,
  deleteConversation,
  getConversations,
  getMessages,
  sendMessage,
} from "../api/chat";
import styles from "./Chat.module.css";

const CONVO_STORAGE_KEY = "chat_conversation_id";
const DOC_STORAGE_KEY = "chat_document_id";

function sourceInfo(source) {
  switch (source.source_type) {
    case "pdf":
      return {
        icon: "file",
        text: `${source.filename || "PDF"}${source.page ? ` · p.${source.page}` : ""}`,
      };
    case "pptx":
      return { icon: "presentation", text: `Slide ${source.slide}` };
    case "youtube":
      return { icon: "video", text: `YouTube @ ${source.timestamp_delay}` };
    case "audio":
      return {
        icon: "audio",
        text: `${source.filename || "Audio"} @ ${source.timestamp_delay}`,
      };
    case "web":
      return { icon: "web", text: "Web source" };
    default:
      return { icon: "file", text: source.source_type };
  }
}

function sourceHref(source) {
  return source.link || source.source_url || null;
}

function conversationTitle(convo, documents) {
  if (!convo.document_id) return "General chat";
  return (
    documents.find((d) => d.id === convo.document_id)?.filename ||
    "Document chat"
  );
}

export default function Chat() {
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [view, setView] = useState("generate"); // 'generate' | 'list'

  const [conversation, setConversation] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [conversationList, setConversationList] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [deletingConvoId, setDeletingConvoId] = useState(null);

  const [sendElapsed, setSendElapsed] = useState(0);
  const abortControllerRef = useRef(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function loadConversationList() {
    setListLoading(true);
    setError("");
    try {
      const data = await getConversations();
      setConversationList(data);
    } catch {
      setError("Could not load your chat history.");
    } finally {
      setListLoading(false);
    }
  }

  function switchToList() {
    setView("list");
    if (conversationList === null) loadConversationList();
  }

  function switchToGenerate() {
    setView("generate");
  }

  async function handleStartChat() {
    setError("");
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
      setConversationList((prev) => (prev ? [convo, ...prev] : prev));
    } catch {
      setError("Could not start a new chat. Try again.");
    }
  }

  function handleBackFromChat() {
    localStorage.removeItem(CONVO_STORAGE_KEY);
    localStorage.removeItem(DOC_STORAGE_KEY);
    setConversation(null);
    setMessages([]);
    setSelectedDocId(null);
    setError("");
  }

  async function handleOpenConversation(convo) {
    setError("");
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
      setError("Could not open that chat.");
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDeleteConversation(convoId) {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;
    setDeletingConvoId(convoId);
    setError("");
    try {
      await deleteConversation(convoId);
      setConversationList((prev) =>
        prev ? prev.filter((c) => c.id !== convoId) : prev,
      );
      if (conversation?.id === convoId) {
        localStorage.removeItem(CONVO_STORAGE_KEY);
        localStorage.removeItem(DOC_STORAGE_KEY);
        setConversation(null);
        setMessages([]);
      }
    } catch {
      setError("Could not delete that chat. Try again.");
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
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      sources: [],
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setSending(true);
    setError("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const assistantMessage = await sendMessage(
        conversation.id,
        content,
        controller.signal,
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
        setError(
          "Cancelled. The assistant may still finish generating on the server even though you stopped waiting for it.",
        );
      } else {
        setError(
          "The assistant could not respond. Your message was sent, so try asking again.",
        );
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
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
      el.style.height = "auto";
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
          <div className={styles.top}>
            <PageHeader
              eyebrow="Ask your material"
              title="Chat"
              subtitle="Ask questions and get answers pulled straight from your uploads, with citations."
            />
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
                New chat
              </button>
              <button
                type="button"
                className={
                  view === "list"
                    ? `${styles.tab} ${styles.tabActive}`
                    : styles.tab
                }
                onClick={switchToList}
              >
                My chats
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <Icon name="x" size={16} />
            <span>{error}</span>
          </div>
        )}

        {!conversation && view === "generate" && (
          <div className={styles.setup}>
            <div className={styles.setupCard}>
              <span className={styles.setupIcon}>
                <Icon name="chat" size={22} />
              </span>
              <h2 className={styles.setupTitle}>Start a conversation</h2>
              <p className={styles.setupHint}>
                Focus on one document, or start a general chat across everything
                you have uploaded.
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
                    <Icon name="layers" size={15} />
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
                      <Icon name="file" size={15} />
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
                <Icon name="sparkle" size={17} />
                Start chat
              </button>
            </div>
          </div>
        )}

        {!conversation && view === "list" && (
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
                  <span className={styles.emptyIcon}>
                    <Icon name="chat" size={24} />
                  </span>
                  <p className={styles.emptyTitle}>No chats yet</p>
                  <p className={styles.emptyDetail}>
                    Start a chat and it will show up here.
                  </p>
                </div>
              )}

            {!listLoading &&
              conversationList !== null &&
              conversationList
                .slice()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((convo, index) => (
                  <div
                    key={convo.id}
                    className={styles.convoRow}
                    style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
                  >
                    <button
                      type="button"
                      className={styles.convoRowMain}
                      onClick={() => handleOpenConversation(convo)}
                      disabled={openingId === convo.id}
                    >
                      <span className={styles.convoIcon}>
                        <Icon name="chat" size={17} />
                      </span>
                      <span className={styles.convoText}>
                        <span className={styles.convoTitle}>
                          {conversationTitle(convo, documents)}
                        </span>
                        <span className={styles.convoDate}>
                          {openingId === convo.id
                            ? "Opening…"
                            : new Date(convo.created_at).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric", year: "numeric" },
                              )}
                        </span>
                      </span>
                      <Icon
                        name="chevronRight"
                        size={16}
                        className={styles.convoChevron}
                      />
                    </button>
                    <button
                      type="button"
                      className={styles.rowDelete}
                      onClick={() => handleDeleteConversation(convo.id)}
                      disabled={deletingConvoId === convo.id}
                      aria-label="Delete chat"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
          </div>
        )}

        {conversation && (
          <div className={styles.chatShell}>
            <div className={styles.chatHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackFromChat}
              >
                <Icon name="arrowLeft" size={17} />
              </button>
              <div className={styles.chatHeaderText}>
                <span className={styles.chatHeaderLabel}>
                  {conversationTitle(conversation, documents)}
                </span>
                <span className={styles.chatHeaderSub}>
                  Grounded in your material
                </span>
              </div>
            </div>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <div className={styles.emptyThread}>
                  <span className={styles.emptyIcon}>
                    <Icon name="sparkle" size={24} />
                  </span>
                  <p className={styles.emptyTitle}>Ask anything</p>
                  <p className={styles.emptyDetail}>
                    Ask a question about your material and I will answer using it
                    directly.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? `${styles.message} ${styles.messageUser}`
                      : `${styles.message} ${styles.messageAssistant}`
                  }
                >
                  {message.role === "assistant" && (
                    <div className={styles.avatar}>
                      <Icon name="sparkle" size={15} />
                    </div>
                  )}

                  <div className={styles.bubbleColumn}>
                    <div className={styles.bubble}>
                      {message.role === "assistant" ? (
                        <Markdown content={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className={styles.sources}>
                        {message.sources.map((source, i) => {
                          const info = sourceInfo(source);
                          const href = sourceHref(source);
                          return href ? (
                            <a
                              key={i}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.sourceChip}
                            >
                              <Icon name={info.icon} size={13} />
                              {info.text}
                            </a>
                          ) : (
                            <span key={i} className={styles.sourceChip}>
                              <Icon name={info.icon} size={13} />
                              {info.text}
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
                  <div className={styles.avatar}>
                    <Icon name="sparkle" size={15} />
                  </div>
                  <div className={styles.bubbleColumn}>
                    <div className={`${styles.bubble} ${styles.typingBubble}`}>
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                    </div>
                    <div className={styles.sendingRow}>
                      {sendElapsed >= 8 && (
                        <span className={styles.sendingHint}>
                          Still thinking through your documents…
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.cancelSendButton}
                        onClick={handleCancelSend}
                      >
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
                aria-label="Send message"
              >
                <Icon name="send" size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
