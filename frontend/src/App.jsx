import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LandingPage from "./LandingPage";
import {
  CirclePlus, MessageSquare, Settings, Send, Copy, RefreshCcw,
  ThumbsUp, ThumbsDown, Sparkles, LogOut, FileUp, FileText,
  CheckCircle, AlertCircle, RotateCcw, X, Loader2, ChevronRight,
  Brain, BookOpen,
} from "lucide-react";
import {
  createConversation, getConversations, getIngestStatus, getMessages,
  ingestPdfs, listDocuments, login, queryRag, reingestDocument,
  setAuthToken, signup,
} from "./api";

/* ─────────────────────────────────────────
   DESIGN TOKENS  (single source of truth)
───────────────────────────────────────── */
// All raw values live here; Tailwind arbitrary classes reference these
// via CSS variables set in index.css

/* ─────────────────────────────────────────
   UTILITY
───────────────────────────────────────── */
function getErrorMessage(err, fallback) {
  const data = err?.response?.data;
  const candidate = data?.error ?? data?.message ?? err?.message;
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  if (candidate && typeof candidate === "object") {
    if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message;
    try { return JSON.stringify(candidate); } catch { return fallback; }
  }
  return fallback;
}

/* ─────────────────────────────────────────
   REUSABLE PRIMITIVES
───────────────────────────────────────── */

/** Consistent section label used throughout sidebar */
function SectionLabel({ children }) {
  return (
    <p className="px-4 mb-1.5 text-xs font-medium tracking-wider text-slate-500 uppercase">
      {children}
    </p>
  );
}

/** Gradient progress bar */
function ProgressBar({ value }) {
  return (
    <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-slate-700/60">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </div>
  );
}

/** Status badge pill */
function StatusBadge({ status }) {
  const map = {
    ready:         { label: "Ready",       cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    processing:    { label: "Indexing…",   cls: "bg-violet-500/10  text-violet-400  border-violet-500/20"  },
    error:         { label: "Error",       cls: "bg-red-500/10     text-red-400     border-red-500/20"     },
    needs_reingest:{ label: "Needs sync",  cls: "bg-amber-500/10   text-amber-400   border-amber-500/20"   },
  };
  const { label, cls } = map[status] || map.needs_reingest;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

/** Toast notification */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 px-4 py-3 shadow-2xl text-sm text-slate-100"
      style={{ animation: "toastIn 0.25s cubic-bezier(0.16,1,0.3,1)" }}
    >
      {/* accent bar */}
      <div className={`absolute left-0 top-0 h-full w-[3px] ${type === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
      <span className={`ml-1 flex-shrink-0 ${type === "success" ? "text-emerald-400" : "text-red-400"}`}>
        {type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      </span>
      <span className="max-w-xs leading-snug">{message}</span>
      <button onClick={onClose} className="ml-2 flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
        <X size={13} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   MARKDOWN RENDERER  (core feature fix)
───────────────────────────────────────── */
function MarkdownContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p:    ({ children }) => <p className="mb-2 last:mb-0 leading-7 text-slate-200">{children}</p>,
        h1:   ({ children }) => <h1 className="mb-3 mt-4 text-lg font-bold text-slate-100 first:mt-0">{children}</h1>,
        h2:   ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold text-slate-100 first:mt-0">{children}</h2>,
        h3:   ({ children }) => <h3 className="mb-2 mt-3 text-sm font-semibold text-slate-200 first:mt-0">{children}</h3>,
        ul:   ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 text-slate-300">{children}</ul>,
        ol:   ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 text-slate-300">{children}</ol>,
        li:   ({ children }) => <li className="leading-6">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-violet-500/50 pl-4 text-slate-400 italic">{children}</blockquote>
        ),
        strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
        em:     ({ children }) => <em className="italic text-slate-300">{children}</em>,
        hr:     () => <hr className="my-4 border-slate-700/60" />,
        a:      ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-violet-400 underline underline-offset-2 hover:text-violet-300 transition-colors">
            {children}
          </a>
        ),
        code: ({ inline, children }) =>
          inline ? (
            <code className="rounded-md bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-cyan-300">
              {children}
            </code>
          ) : (
            <div className="my-3 overflow-hidden rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between border-b border-slate-700/60 bg-slate-800/80 px-4 py-2">
                <span className="font-mono text-[10px] text-slate-500">code</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900/80 p-4">
                <code className="font-mono text-xs leading-6 text-slate-300">{children}</code>
              </pre>
            </div>
          ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-slate-700/60">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-800/60 text-slate-300">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-slate-700/40 text-slate-400">{children}</tbody>,
        th:    ({ children }) => <th className="px-4 py-2.5 text-left text-xs font-semibold">{children}</th>,
        td:    ({ children }) => <td className="px-4 py-2.5 text-xs">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ─────────────────────────────────────────
   AUTH SCREEN
───────────────────────────────────────── */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") await signup({ username, email, password });
      const result = await login({ username, password });
      onAuth({ token: result.token, username: result.username });
    } catch (err) {
      setError(getErrorMessage(err, "Authentication failed"));
    } finally {
      setLoading(false);
    }
  }

  const inputCls = [
    "w-full rounded-xl border border-slate-700/60 bg-slate-900/80",
    "px-4 py-3 text-sm text-slate-200 placeholder-slate-600",
    "outline-none transition-all duration-150",
    "focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15",
  ].join(" ");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F14] p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-2xl shadow-lg shadow-violet-500/20">
            🧠
          </div>
          <h1 className="text-2xl font-bold text-slate-100">DocRAG</h1>
          <p className="mt-1 text-sm text-slate-500">Chat with your PDFs</p>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
          {/* Tab switcher */}
          <div className="mb-6 flex rounded-xl bg-slate-950/60 p-1">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                  mode === m
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input className={inputCls} placeholder="Email address" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            )}
            <input className={inputCls} placeholder="Username"
              value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input className={inputCls} placeholder="Password" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle size={13} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-violet-400 disabled:opacity-50"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Please wait…</span>
                : mode === "login" ? "Sign In" : "Create Account"
              }
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SIDEBAR COMPONENTS
───────────────────────────────────────── */

/** Single conversation row */
function ConversationItem({ conv, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150",
        active
          ? "bg-violet-600/15 text-violet-300 border border-violet-500/25"
          : "border border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
      ].join(" ")}
    >
      <MessageSquare size={13} className="flex-shrink-0 opacity-60" />
      <span className="flex-1 truncate">{conv.title || "Untitled chat"}</span>
      {active && <ChevronRight size={12} className="flex-shrink-0 opacity-50" />}
    </button>
  );
}

/** Document card in sidebar */
function DocCard({ doc, status, onReingest }) {
  const isReady      = status.status === "ready";
  const isProcessing = status.status === "processing";
  const isError      = status.status === "error";

  return (
    <div className={[
      "rounded-xl border px-3 py-2.5 text-xs transition-all",
      isReady       ? "border-emerald-500/20 bg-emerald-500/[0.06]" :
      isProcessing  ? "border-violet-500/20  bg-violet-500/[0.06] animate-pulse-border" :
      isError       ? "border-red-500/20     bg-red-500/[0.06]"    :
                      "border-amber-500/20   bg-amber-500/[0.06]",
    ].join(" ")}>
      <div className="flex items-start gap-2">
        <FileText size={12} className={[
          "mt-0.5 flex-shrink-0",
          isReady ? "text-emerald-400" : isProcessing ? "text-violet-400" : isError ? "text-red-400" : "text-amber-400",
        ].join(" ")} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-300 leading-snug" title={doc}>{doc}</p>
          <div className="mt-1">
            <StatusBadge status={status.status} />
          </div>
          {isProcessing && <ProgressBar value={status.progress || 0} />}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 mt-0.5">
          {isProcessing && <Loader2 size={12} className="animate-spin text-violet-400" />}
          {isReady      && <CheckCircle size={12} className="text-emerald-400" />}
          {!isReady && !isProcessing && (
            <button
              onClick={() => onReingest(doc)}
              title="Re-index"
              className="rounded-md p-0.5 text-slate-500 hover:bg-slate-700/60 hover:text-amber-400 transition-colors"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Full sidebar */
function Sidebar({
  username, conversations, activeConversationId, uploadedDocs, docStatuses,
  readyCount, onNewChat, onSelectConversation, onUploadClick, onReingest, onLogout,
  fileInputRef, onFileChange,
}) {
  return (
    <aside className="flex h-screen w-[260px] flex-shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/90">

      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-sm shadow-md shadow-violet-500/20">
          🧠
        </div>
        <span className="text-base font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          DocRAG
        </span>
      </div>

      {/* ── New Chat ── */}
      <div className="px-3 pb-4">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-[0.98]"
        >
          <CirclePlus size={15} />
          New Chat
        </button>
      </div>

      <div className="mx-4 border-t border-slate-800/80" />

      {/* ── Conversations (flex-1, scrollable) ── */}
      <div className="flex flex-1 flex-col overflow-hidden pt-4 min-h-0">
        <SectionLabel>Conversations</SectionLabel>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0 pb-2">
          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <MessageSquare size={20} className="mx-auto mb-2 text-slate-700" />
              <p className="text-xs text-slate-600">No conversations yet</p>
              <p className="mt-0.5 text-[10px] text-slate-700">Start by uploading a PDF</p>
            </div>
          ) : conversations.map((c) => (
            <ConversationItem
              key={c.conversation_id}
              conv={c}
              active={c.conversation_id === activeConversationId}
              onClick={() => onSelectConversation(c.conversation_id)}
            />
          ))}
        </div>
      </div>

      <div className="mx-4 border-t border-slate-800/80" />

      {/* ── Documents panel (fixed height) ── */}
      <div className="flex flex-col pt-4" style={{ maxHeight: "38vh" }}>
        <div className="flex items-center justify-between px-4 mb-1.5">
          <SectionLabel>Documents</SectionLabel>
          {readyCount > 0 && (
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              {readyCount} ready
            </span>
          )}
        </div>

        {/* Upload button */}
        <div className="px-3 mb-2">
          <button
            onClick={onUploadClick}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-2.5 text-xs text-slate-500 transition-all hover:border-violet-500/40 hover:bg-violet-500/[0.05] hover:text-violet-400"
          >
            <FileUp size={13} />
            <span>Upload PDFs</span>
            <span className="ml-auto text-[10px] text-slate-700">or drag & drop</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={onFileChange}
            className="hidden"
          />
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1.5 pb-3 min-h-0">
          {uploadedDocs.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <BookOpen size={18} className="mx-auto mb-2 text-slate-700" />
              <p className="text-xs text-slate-600">No PDFs uploaded yet</p>
            </div>
          ) : uploadedDocs.map((doc) => (
            <DocCard
              key={doc}
              doc={doc}
              status={docStatuses[doc] || { status: "needs_reingest", progress: 0 }}
              onReingest={onReingest}
            />
          ))}
        </div>
      </div>

      <div className="mx-4 border-t border-slate-800/80" />

      {/* ── User section ── */}
      <div className="px-3 py-3 flex-shrink-0">
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all hover:bg-slate-800/60 hover:text-slate-300 mb-1">
          <Settings size={13} />
          Settings
        </button>
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-[11px] font-bold text-white">
            {(username || "U").slice(0, 1).toUpperCase()}
          </div>
          <span className="flex-1 truncate text-xs font-medium text-slate-300">{username}</span>
          <button
            onClick={onLogout}
            title="Sign out"
            className="text-slate-600 hover:text-slate-300 transition-colors"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────
   CHAT COMPONENTS
───────────────────────────────────────── */

/** Processing banner shown in main area when docs are indexing */
function IndexingBanner({ docStatuses }) {
  const processing = Object.entries(docStatuses).filter(([, s]) => s.status === "processing");
  if (!processing.length) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-4 py-3">
      <Loader2 size={15} className="mt-0.5 flex-shrink-0 animate-spin text-violet-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-violet-300">
          Indexing {processing.length} document{processing.length > 1 ? "s" : ""}…
        </p>
        <div className="mt-2 space-y-1.5">
          {processing.map(([name, s]) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 truncate max-w-[200px]">{name}</span>
                <span className="text-[10px] text-violet-400 ml-2">{s.progress || 0}%</span>
              </div>
              <ProgressBar value={s.progress || 0} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">You can start chatting once indexing completes.</p>
      </div>
    </div>
  );
}

/** User message bubble */
function UserMessage({ content }) {
  return (
    <div className="flex justify-end msg-enter">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-violet-500/20 bg-violet-600/[0.18] px-4 py-3">
        <p className="text-sm leading-7 text-slate-200">{content}</p>
      </div>
    </div>
  );
}

/** AI message bubble with markdown + actions */
function AssistantMessage({ content, onCopy }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Extract source references from content (pattern: [source: X] or — Source: X)
  const sourceMatch = content.match(/(?:\[source[s]?:\s*([^\]]+)\]|—\s*Source[s]?:\s*(.+?)(?:\n|$))/gi);

  return (
    <div className="flex items-start gap-3 msg-enter">
      {/* AI avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-md shadow-violet-500/20">
        <Brain size={14} className="text-white" />
      </div>

      <div className="min-w-0 flex-1 max-w-[85%]">
        {/* Message bubble */}
        <div className="rounded-2xl rounded-tl-sm border border-slate-700/50 bg-slate-900/70 px-5 py-4">
          <div className="prose-sm">
            <MarkdownContent content={content} />
          </div>

          {/* Source references */}
          {sourceMatch && sourceMatch.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700/40 pt-3">
              <span className="text-[10px] font-medium text-slate-600 self-center">Sources:</span>
              {sourceMatch.map((src, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.07] px-2.5 py-1 font-mono text-[10px] text-cyan-400">
                  <FileText size={9} />
                  {src.replace(/[\[\]—]/g, "").replace(/source[s]?:\s*/i, "").trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="mt-1.5 flex items-center gap-1 px-1">
          <button
            onClick={handleCopy}
            title="Copy"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-600 transition-all hover:bg-slate-800/60 hover:text-slate-300"
          >
            <Copy size={12} />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="rounded-lg p-1.5 text-slate-600 transition-all hover:bg-slate-800/60 hover:text-slate-300">
            <ThumbsUp size={12} />
          </button>
          <button className="rounded-lg p-1.5 text-slate-600 transition-all hover:bg-slate-800/60 hover:text-slate-300">
            <ThumbsDown size={12} />
          </button>
          <button className="rounded-lg p-1.5 text-slate-600 transition-all hover:bg-slate-800/60 hover:text-slate-300">
            <RefreshCcw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Typing indicator */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 msg-enter">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-md shadow-violet-500/20">
        <Brain size={14} className="text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-slate-700/50 bg-slate-900/70 px-5 py-4">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-500"
              style={{ animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Empty state — no PDFs */
function EmptyNoPdfs({ onUploadClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/60">
        <FileUp size={30} className="text-slate-600" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-slate-200">No documents yet</h2>
      <p className="mb-6 max-w-xs text-sm text-slate-500 leading-relaxed">
        Upload one or more PDFs to get started. You can chat across all of them simultaneously.
      </p>
      <button
        onClick={onUploadClick}
        className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-[0.98]"
      >
        <FileUp size={15} />
        Upload PDFs
      </button>
      <p className="mt-3 text-xs text-slate-700">or drag & drop files anywhere on the page</p>
    </div>
  );
}

/** Empty state — has PDFs, no messages yet */
function EmptyReadyToChat({ readyCount, onChipClick }) {
  const chips = [
    "Summarize the key points",
    "What are the main findings?",
    "List the important conclusions",
    "Compare the documents",
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/[0.08]">
        <Sparkles size={30} className="text-violet-400" />
      </div>
      <h2 className="mb-1 text-lg font-semibold text-slate-200">Ready to chat</h2>
      <p className="mb-8 text-sm text-slate-500">
        {readyCount} document{readyCount !== 1 ? "s" : ""} indexed — ask anything
      </p>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => onChipClick(chip)}
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm text-slate-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/[0.07] hover:text-violet-300"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Chat input bar */
function ChatInput({ prompt, hasReady, loading, textareaRef, onChange, onKeyDown, onSubmit }) {
  return (
    <div className="flex-shrink-0 border-t border-slate-800/80 bg-slate-950/80 px-4 py-4 backdrop-blur">
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
        <div className={[
          "flex items-end gap-3 rounded-2xl border bg-slate-900/80 px-4 py-3 transition-all duration-150",
          "focus-within:border-violet-500/40 focus-within:ring-2 focus-within:ring-violet-500/10",
          hasReady ? "border-slate-700/60" : "border-slate-800/60",
        ].join(" ")}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={hasReady ? "Ask anything across your documents…" : "Upload PDFs first to start chatting…"}
            disabled={!hasReady || loading}
            className="flex-1 resize-none bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none disabled:cursor-not-allowed disabled:opacity-40"
            style={{ minHeight: "24px", maxHeight: "160px" }}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim() || !hasReady}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20 transition-all hover:bg-violet-500 disabled:opacity-30 disabled:shadow-none active:scale-95"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        {hasReady && (
          <p className="mt-2 text-center text-[11px] text-slate-700">
            Press <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-500">Enter</kbd> to send
            &nbsp;·&nbsp;
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-500">Shift+Enter</kbd> for new line
          </p>
        )}
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────
   ROOT APP
───────────────────────────────────────── */
export default function App() {
  const [token, setToken]                       = useState(localStorage.getItem("token") || "");
  const [username, setUsername]                 = useState(localStorage.getItem("username") || "");
  const [conversations, setConversations]       = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages]                 = useState([]);
  const [prompt, setPrompt]                     = useState("");
  const [loading, setLoading]                   = useState(false);
  const [uploadedDocs, setUploadedDocs]         = useState([]);
  const [docStatuses, setDocStatuses]           = useState({});
  const [toast, setToast]                       = useState(null);
  const [error, setError]                       = useState("");
  const [dragOver, setDragOver]                 = useState(false);
  const [showLanding, setShowLanding]           = useState(!token);

  const fileInputRef  = useRef(null);
  const chatBottomRef = useRef(null);
  const textareaRef   = useRef(null);
  const pollersRef    = useRef({});

  /* ── Auth token sync ── */
  useEffect(() => { setAuthToken(token); }, [token]);

  /* ── Initial data load ── */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [convItems, docs] = await Promise.all([getConversations(), listDocuments()]);
        setConversations(convItems);
        if (convItems.length > 0) setActiveConversationId(convItems[0].conversation_id);
        setUploadedDocs(docs);
        const statuses = {};
        docs.forEach((d) => { statuses[d] = { status: "needs_reingest", progress: 0, message: "Needs re-indexing after restart" }; });
        setDocStatuses(statuses);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load data"));
      }
    })();
  }, [token]);

  /* ── Load messages when conversation changes ── */
  useEffect(() => {
    if (!token || !activeConversationId) { setMessages([]); return; }
    (async () => {
      try { setMessages(await getMessages(activeConversationId)); }
      catch (err) { setError(getErrorMessage(err, "Failed to load messages")); }
    })();
  }, [token, activeConversationId]);

  /* ── Auto-scroll ── */
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  /* ── Cleanup pollers ── */
  useEffect(() => () => { Object.values(pollersRef.current).forEach(clearInterval); }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.conversation_id === activeConversationId),
    [conversations, activeConversationId]
  );

  const readyCount = Object.values(docStatuses).filter((s) => s.status === "ready").length;
  const hasReady   = readyCount > 0;

  /* ── Polling ── */
  const startPolling = useCallback((jobId, filename) => {
    if (pollersRef.current[jobId]) return;
    const interval = setInterval(async () => {
      try {
        const job = await getIngestStatus(jobId);
        const mapped = job.status === "done" ? "ready" : job.status === "error" ? "error" : "processing";
        setDocStatuses((prev) => ({ ...prev, [filename]: { status: mapped, progress: job.progress, message: job.message, jobId } }));
        if (job.status === "done") {
          clearInterval(interval); delete pollersRef.current[jobId];
          showToast(`"${filename}" is ready to query!`);
        } else if (job.status === "error") {
          clearInterval(interval); delete pollersRef.current[jobId];
          showToast(`Failed to index "${filename}": ${job.message}`, "error");
        }
      } catch {
        clearInterval(interval); delete pollersRef.current[jobId];
      }
    }, 2000);
    pollersRef.current[jobId] = interval;
  }, []);

  function showToast(message, type = "success") { setToast({ message, type }); }

  /* ── Handlers ── */
  function handleAuth({ token: t, username: u }) {
    localStorage.setItem("token", t);
    localStorage.setItem("username", u);
    setToken(t); setUsername(u); setShowLanding(false);
  }

  async function handleNewChat() {
    setError("");
    try {
      const created = await createConversation("New chat");
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.conversation_id);
      setMessages([]);
    } catch (err) { setError(getErrorMessage(err, "Failed to create conversation")); }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    if (!hasReady) {
      setError("Please upload and wait for at least one PDF to finish indexing before asking questions.");
      return;
    }
    setError("");
    setLoading(true);
    const localMsg = { role: "user", content: prompt, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, localMsg]);
    const currentPrompt = prompt;
    setPrompt("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    try {
      const response = await queryRag({ query: currentPrompt, conversationId: activeConversationId || null });
      if (!activeConversationId && response.conversation_id) {
        setConversations(await getConversations());
        setActiveConversationId(response.conversation_id);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: response.answer, created_at: new Date().toISOString() }]);
    } catch (err) {
      setError(getErrorMessage(err, "Query failed"));
      setMessages((prev) => prev.slice(0, -1));
    } finally { setLoading(false); }
  }

  async function handleUploadPdf(event) {
    const files = Array.from(event.target?.files || event.dataTransfer?.files || []);
    if (!files.length) return;
    setError("");
    const newDocs = files.map((f) => f.name);
    setDocStatuses((prev) => {
      const updated = { ...prev };
      newDocs.forEach((n) => { updated[n] = { status: "processing", progress: 0, message: "Uploading…" }; });
      return updated;
    });
    try {
      const result = await ingestPdfs(files);
      const docs = await listDocuments();
      setUploadedDocs(docs);
      for (const job of result.jobs || []) {
        setDocStatuses((prev) => ({ ...prev, [job.filename]: { status: "processing", progress: 0, message: "Starting…", jobId: job.job_id } }));
        startPolling(job.job_id, job.filename);
      }
      showToast(`${result.jobs?.length || 0} file(s) uploaded — indexing in background…`);
    } catch (err) {
      showToast(getErrorMessage(err, "Upload failed"), "error");
      setDocStatuses((prev) => {
        const updated = { ...prev };
        newDocs.forEach((n) => { delete updated[n]; });
        return updated;
      });
    } finally { if (event.target) event.target.value = ""; }
  }

  async function handleReingest(filename) {
    setDocStatuses((prev) => ({ ...prev, [filename]: { status: "processing", progress: 0, message: "Starting re-index…" } }));
    try {
      const result = await reingestDocument(filename);
      startPolling(result.job_id, filename);
    } catch (err) {
      showToast(getErrorMessage(err, "Re-index failed"), "error");
      setDocStatuses((prev) => ({ ...prev, [filename]: { status: "error", progress: 0, message: "Failed" } }));
    }
  }

  function handleLogout() {
    Object.values(pollersRef.current).forEach(clearInterval);
    pollersRef.current = {};
    localStorage.removeItem("token"); localStorage.removeItem("username");
    setAuthToken("");
    setToken(""); setUsername(""); setConversations([]); setActiveConversationId("");
    setMessages([]); setUploadedDocs([]); setDocStatuses({}); setShowLanding(true);
  }

  function handleTextareaChange(e) {
    setPrompt(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  }

  /* ── Route guards ── */
  if (showLanding && !token) return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  if (!token) return <AuthScreen onAuth={handleAuth} />;

  /* ── Main app shell ── */
  return (
    <div
      className="flex h-screen bg-[#0B0F14] text-slate-100 overflow-hidden relative"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUploadPdf(e); }}
    >
      {/* Global styles */}
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1;   }
        }
        .msg-enter { animation: msgIn 0.2s ease-out; }
      `}</style>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Drag overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-violet-500/60 bg-violet-600/10 backdrop-blur-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-violet-400/60 bg-violet-500/10">
            <FileUp size={36} className="text-violet-400" />
          </div>
          <p className="text-lg font-semibold text-violet-300">Drop PDFs here</p>
          <p className="text-sm text-violet-400/60">Release to upload</p>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        username={username}
        conversations={conversations}
        activeConversationId={activeConversationId}
        uploadedDocs={uploadedDocs}
        docStatuses={docStatuses}
        readyCount={readyCount}
        onNewChat={handleNewChat}
        onSelectConversation={setActiveConversationId}
        onUploadClick={() => fileInputRef.current?.click()}
        onReingest={handleReingest}
        onLogout={handleLogout}
        fileInputRef={fileInputRef}
        onFileChange={handleUploadPdf}
      />

      {/* Main area */}
      <main className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-800/80 bg-slate-950/60 px-6 backdrop-blur">
          <span className="flex-1 truncate text-sm font-medium text-slate-200">
            {activeConversation?.title || "DocRAG"}
          </span>
          {hasReady && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle size={11} />
              {readyCount} doc{readyCount !== 1 ? "s" : ""} ready
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto w-full max-w-3xl">

            {/* Error banner */}
            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-400">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span className="flex-1 leading-snug">{error}</span>
                <button onClick={() => setError("")} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Indexing banner */}
            <IndexingBanner docStatuses={docStatuses} />

            {/* Empty states */}
            {!messages.length && !loading && (
              !hasReady
                ? <EmptyNoPdfs onUploadClick={() => fileInputRef.current?.click()} />
                : <EmptyReadyToChat
                    readyCount={readyCount}
                    onChipClick={(text) => { setPrompt(text); textareaRef.current?.focus(); }}
                  />
            )}

            {/* Message list */}
            <div className="space-y-6">
              {messages.map((msg, i) =>
                msg.role === "user"
                  ? <UserMessage key={`${msg.created_at}-${i}`} content={msg.content} />
                  : <AssistantMessage key={`${msg.created_at}-${i}`} content={msg.content} />
              )}
              {loading && <TypingIndicator />}
            </div>

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput
          prompt={prompt}
          hasReady={hasReady}
          loading={loading}
          textareaRef={textareaRef}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onSubmit={handleSend}
        />
      </main>
    </div>
  );
}
