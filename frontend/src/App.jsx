import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CirclePlus,
  MessageSquare,
  Settings,
  Send,
  Copy,
  RefreshCcw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  LogOut,
  FileUp,
  FileText,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  X,
  Loader2,
} from "lucide-react";
import {
  createConversation,
  getConversations,
  getIngestStatus,
  getMessages,
  ingestPdfs,
  listDocuments,
  login,
  queryRag,
  reingestDocument,
  setAuthToken,
  signup,
} from "./api";

function formatAssistantMessage(content) {
  return String(content || "").split("\n").filter((l) => l.trim().length > 0);
}

function getErrorMessage(err, fallback) {
  const data = err?.response?.data;
  const candidate = data?.error ?? data?.message ?? err?.message;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }
  if (candidate && typeof candidate === "object") {
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
    try {
      return JSON.stringify(candidate);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-medium text-white ${type === "success" ? "bg-green-500" : "bg-red-500"}`}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span>{message}</span>
      <button onClick={onClose}><X size={14} className="opacity-70 hover:opacity-100" /></button>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

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

  return (
    <div className="min-h-screen bg-slateMist p-6 md:p-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center rounded-[24px] bg-white/70 p-6 shadow-cloud backdrop-blur-xl md:p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-8 shadow-soft">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Welcome</p>
          <h1 className="mb-6 text-3xl font-bold text-slate-900">CHAT A.I+</h1>
          {mode === "signup" && (
            <input className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-300" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          )}
          <input className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-300" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-300" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="mb-3 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-95 disabled:opacity-60">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
          </button>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-sm text-slate-600">
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  // docStatuses: filename -> { status: 'ready'|'processing'|'error', progress: 0-100, message, jobId }
  const [docStatuses, setDocStatuses] = useState({});
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const pollersRef = useRef({});

  useEffect(() => { setAuthToken(token); }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [convItems, docs] = await Promise.all([getConversations(), listDocuments()]);
        setConversations(convItems);
        if (convItems.length > 0) setActiveConversationId(convItems[0].conversation_id);
        setUploadedDocs(docs);
        // Docs on disk are not yet in Qdrant (in-memory), so mark them as needing re-index
        const statuses = {};
        docs.forEach((d) => { statuses[d] = { status: "needs_reingest", progress: 0, message: "Needs re-indexing after restart" }; });
        setDocStatuses(statuses);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load data"));
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !activeConversationId) { setMessages([]); return; }
    (async () => {
      try { setMessages(await getMessages(activeConversationId)); }
      catch (err) { setError(getErrorMessage(err, "Failed to load messages")); }
    })();
  }, [token, activeConversationId]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.conversation_id === activeConversationId),
    [conversations, activeConversationId]
  );

  const startPolling = useCallback((jobId, filename) => {
    if (pollersRef.current[jobId]) return;
    const interval = setInterval(async () => {
      try {
        const job = await getIngestStatus(jobId);
        setDocStatuses((prev) => ({
          ...prev,
          [filename]: { status: job.status === "done" ? "ready" : job.status === "error" ? "error" : "processing", progress: job.progress, message: job.message, jobId },
        }));
        if (job.status === "done") {
          clearInterval(interval);
          delete pollersRef.current[jobId];
          showToast(`"${filename}" is ready to query!`);
        } else if (job.status === "error") {
          clearInterval(interval);
          delete pollersRef.current[jobId];
          showToast(`Failed to index "${filename}": ${job.message}`, "error");
        }
      } catch {
        clearInterval(interval);
        delete pollersRef.current[jobId];
      }
    }, 2000);
    pollersRef.current[jobId] = interval;
  }, []);

  useEffect(() => () => { Object.values(pollersRef.current).forEach(clearInterval); }, []);

  function showToast(message, type = "success") { setToast({ message, type }); }

  function handleAuth({ token: t, username: u }) {
    localStorage.setItem("token", t);
    localStorage.setItem("username", u);
    setToken(t);
    setUsername(u);
  }

  async function handleNewChat() {
    setError("");
    try {
      const created = await createConversation("New chat");
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.conversation_id);
      setMessages([]);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create conversation"));
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const readyDocs = Object.values(docStatuses).filter((s) => s.status === "ready");
    if (readyDocs.length === 0) {
      setError("Please upload and wait for at least one PDF to finish indexing before asking questions.");
      return;
    }
    setError("");
    setLoading(true);
    const localMsg = { role: "user", content: prompt, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, localMsg]);
    const currentPrompt = prompt;
    setPrompt("");
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
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadPdf(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setError("");
    // Immediately show pending state for each file
    const newDocs = files.map((f) => f.name);
    setDocStatuses((prev) => {
      const updated = { ...prev };
      newDocs.forEach((n) => { updated[n] = { status: "processing", progress: 0, message: "Uploading..." }; });
      return updated;
    });
    try {
      const result = await ingestPdfs(files);
      // Update doc list
      const docs = await listDocuments();
      setUploadedDocs(docs);
      // Start polling for each job
      for (const job of result.jobs || []) {
        setDocStatuses((prev) => ({
          ...prev,
          [job.filename]: { status: "processing", progress: 0, message: "Starting...", jobId: job.job_id },
        }));
        startPolling(job.job_id, job.filename);
      }
      showToast(`${result.jobs?.length || 0} file(s) uploaded — indexing in background...`);
    } catch (err) {
      showToast(getErrorMessage(err, "Upload failed"), "error");
      setDocStatuses((prev) => {
        const updated = { ...prev };
        newDocs.forEach((n) => { delete updated[n]; });
        return updated;
      });
    } finally {
      event.target.value = "";
    }
  }

  async function handleReingest(filename) {
    setDocStatuses((prev) => ({ ...prev, [filename]: { status: "processing", progress: 0, message: "Starting re-index..." } }));
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
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setAuthToken("");
    setToken(""); setUsername(""); setConversations([]); setActiveConversationId(""); setMessages([]); setUploadedDocs([]); setDocStatuses({});
  }

  if (!token) return <AuthScreen onAuth={handleAuth} />;

  const readyCount = Object.values(docStatuses).filter((s) => s.status === "ready").length;
  const hasReady = readyCount > 0;

  return (
    <div className="min-h-screen bg-slateMist p-4 md:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1280px] rounded-[24px] bg-white/65 shadow-cloud backdrop-blur-xl">

        {/* ── Sidebar ── */}
        <aside className="flex w-full max-w-[280px] flex-col rounded-l-[24px] border-r border-slate-200 bg-slate-50/90 p-4 md:p-6 overflow-hidden">
          <h1 className="mb-5 text-2xl font-extrabold tracking-[0.2em] text-slate-900">CHAT A.I+</h1>

          <button onClick={handleNewChat} className="mb-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-soft">
            <CirclePlus size={16} /> New chat
          </button>

          {/* Conversations */}
          <p className="mb-2 text-xs font-medium text-slate-500">Conversations</p>
          <div className="scrollbar-thin mb-4 max-h-[22vh] space-y-1 overflow-y-auto pr-1 flex-shrink-0">
            {conversations.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-400">No conversations yet</p>
            ) : conversations.map((c) => {
              const active = c.conversation_id === activeConversationId;
              return (
                <button key={c.conversation_id} onClick={() => setActiveConversationId(c.conversation_id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${active ? "border border-blue-200 bg-blue-50 text-blue-700" : "border border-transparent text-slate-700 hover:bg-white"}`}>
                  <MessageSquare size={14} className="flex-shrink-0" />
                  <span className="truncate">{c.title || "Untitled chat"}</span>
                </button>
              );
            })}
          </div>

          {/* PDF Knowledge Base */}
          <div className="flex flex-1 flex-col rounded-2xl border border-dashed border-slate-300 bg-white p-3 min-h-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">PDF Knowledge Base</p>
              {readyCount > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">{readyCount} ready</span>
              )}
            </div>

            <button onClick={() => fileInputRef.current?.click()}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
              <FileUp size={16} /> Upload PDFs
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={handleUploadPdf} className="hidden" />

            {/* Document list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {uploadedDocs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3">No PDFs uploaded yet</p>
              ) : uploadedDocs.map((doc) => {
                const s = docStatuses[doc] || { status: "needs_reingest", progress: 0, message: "Needs re-indexing" };
                const isReady = s.status === "ready";
                const isProcessing = s.status === "processing";
                const isError = s.status === "error";
                return (
                  <div key={doc} className={`rounded-xl border px-3 py-2 text-xs ${isReady ? "border-green-200 bg-green-50" : isProcessing ? "border-blue-200 bg-blue-50" : isError ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-start gap-2">
                      <FileText size={13} className={`mt-0.5 flex-shrink-0 ${isReady ? "text-green-600" : isProcessing ? "text-blue-500" : isError ? "text-red-500" : "text-amber-600"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800" title={doc}>{doc}</p>
                        <p className={`text-[10px] mt-0.5 ${isReady ? "text-green-600" : isProcessing ? "text-blue-500" : isError ? "text-red-500" : "text-amber-600"}`}>
                          {isProcessing ? s.message || "Indexing..." : isReady ? "✓ Ready to query" : isError ? `✗ ${s.message}` : "⚠ Needs re-indexing"}
                        </p>
                        {isProcessing && <ProgressBar value={s.progress} />}
                      </div>
                      {!isReady && !isProcessing && (
                        <button onClick={() => handleReingest(doc)} title="Re-index" className="flex-shrink-0 rounded p-1 hover:bg-white/60">
                          <RotateCcw size={12} className="text-amber-600" />
                        </button>
                      )}
                      {isProcessing && <Loader2 size={13} className="flex-shrink-0 animate-spin text-blue-500 mt-0.5" />}
                      {isReady && <CheckCircle size={13} className="flex-shrink-0 text-green-500 mt-0.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom user area */}
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 flex-shrink-0">
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-white">
              <Settings size={15} /> Settings
            </button>
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-pink-400 to-blue-500 text-xs font-semibold text-white">
                  {(username || "U").slice(0, 1).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-slate-800">{username}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900"><LogOut size={16} /></button>
            </div>
          </div>
        </aside>

        {/* ── Chat area ── */}
        <main className="relative flex-1 rounded-r-[24px] bg-white/80 p-4 md:p-8">
          <div className="scrollbar-thin mb-24 h-[calc(100vh-8.5rem)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-6 shadow-soft">

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError("")}><X size={13} className="opacity-60 hover:opacity-100" /></button>
              </div>
            )}

            {!messages.length && (
              <div className="flex h-full items-center justify-center text-center">
                {!hasReady ? (
                  <div>
                    <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-blue-50 mx-auto">
                      <FileUp size={28} className="text-blue-400" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-slate-800">Upload PDFs to get started</h2>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">Upload one or more PDF documents from the sidebar. You can chat across all of them at once.</p>
                    <button onClick={() => fileInputRef.current?.click()} className="mt-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-soft">
                      Upload PDFs
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Ready</p>
                    <h2 className="text-2xl font-semibold text-slate-800">{activeConversation?.title || "Ask anything about your documents"}</h2>
                    <p className="mt-2 text-sm text-slate-400">{readyCount} document{readyCount !== 1 ? "s" : ""} indexed and ready</p>
                  </div>
                )}
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.created_at}-${index}`} className="mb-8">
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {message.role === "assistant" ? "AI" : (username || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700">{message.role === "assistant" ? "CHAT A.I+" : username}</span>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${message.role === "assistant" ? "bg-slate-50" : "bg-blue-50"}`}>
                  {message.role === "assistant" ? (
                    <div>
                      <div className="space-y-2 text-sm leading-7 text-slate-700">
                        {formatAssistantMessage(message.content).map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-slate-400">
                        <button className="hover:text-slate-700"><ThumbsUp size={16} /></button>
                        <button className="hover:text-slate-700"><ThumbsDown size={16} /></button>
                        <button onClick={() => navigator.clipboard.writeText(message.content)} title="Copy" className="hover:text-slate-700"><Copy size={16} /></button>
                        <button className="hover:text-slate-700"><RefreshCcw size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-slate-700">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <Loader2 size={16} className="animate-spin" /> Thinking...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSend} className="absolute bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-soft">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={hasReady ? "Ask anything across all your documents..." : "Upload PDFs first to start chatting..."}
              disabled={!hasReady || loading}
              className="flex-1 border-none bg-transparent px-3 py-2 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button type="submit" disabled={loading || !prompt.trim() || !hasReady}
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-soft disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </main>

        <button className="absolute right-2 top-1/2 hidden -translate-y-1/2 rotate-180 rounded-l-xl bg-gradient-to-b from-indigo-500 to-blue-500 px-2 py-5 text-xs font-semibold text-white shadow-soft [writing-mode:vertical-lr] md:block">
          <span className="flex items-center gap-1"><Sparkles size={14} /> Upgrade to Pro</span>
        </button>
      </div>
    </div>
  );
}
