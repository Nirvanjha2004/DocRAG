import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import {
  createConversation,
  getConversations,
  getMessages,
  ingestPdf,
  listDocuments,
  login,
  queryRag,
  reingestDocument,
  setAuthToken,
  signup,
} from "./api";

function formatAssistantMessage(content) {
  const lines = String(content || "").split("\n").filter((line) => line.trim().length > 0);
  return lines;
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-medium text-white transition ${type === "success" ? "bg-green-500" : "bg-red-500"}`}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X size={14} /></button>
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
      if (mode === "signup") {
        await signup({ username, email, password });
      }
      const result = await login({ username, password });
      onAuth({ token: result.token, username: result.username });
    } catch (err) {
      setError(err?.response?.data?.error || "Authentication failed");
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
            <input
              className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-300"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          <input
            className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-300"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-300"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mb-3 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-sm text-slate-600"
          >
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
  const [ingesting, setIngesting] = useState(false);
  const [reingesting, setReingesting] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [ingestedDocs, setIngestedDocs] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [convItems, docs] = await Promise.all([getConversations(), listDocuments()]);
        setConversations(convItems);
        if (convItems.length > 0) setActiveConversationId(convItems[0].conversation_id);
        setUploadedDocs(docs);
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load data");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !activeConversationId) { setMessages([]); return; }
    (async () => {
      try {
        const items = await getMessages(activeConversationId);
        setMessages(items);
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load messages");
      }
    })();
  }, [token, activeConversationId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.conversation_id === activeConversationId),
    [conversations, activeConversationId]
  );

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  function handleAuth({ token: nextToken, username: nextUsername }) {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("username", nextUsername);
    setToken(nextToken);
    setUsername(nextUsername);
  }

  async function handleNewChat() {
    setError("");
    try {
      const created = await createConversation("New chat");
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.conversation_id);
      setMessages([]);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create conversation");
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    if (ingestedDocs.size === 0) {
      setError("Please upload and ingest a PDF first before asking questions.");
      return;
    }
    setError("");
    setLoading(true);

    const localUserMessage = { role: "user", content: prompt, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, localUserMessage]);
    const currentPrompt = prompt;
    setPrompt("");

    try {
      const response = await queryRag({ query: currentPrompt, conversationId: activeConversationId || null });
      if (!activeConversationId && response.conversation_id) {
        const items = await getConversations();
        setConversations(items);
        setActiveConversationId(response.conversation_id);
      }
      const localAssistantMessage = { role: "assistant", content: response.answer, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, localAssistantMessage]);
    } catch (err) {
      setError(err?.response?.data?.error || "Query failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadPdf(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setIngesting(true);
    try {
      await ingestPdf(file);
      const docs = await listDocuments();
      setUploadedDocs(docs);
      setIngestedDocs((prev) => new Set([...prev, file.name]));
      showToast(`"${file.name}" uploaded and indexed successfully!`);
    } catch (err) {
      showToast(err?.response?.data?.error || "Upload failed", "error");
    } finally {
      setIngesting(false);
      event.target.value = "";
    }
  }

  async function handleReingest(filename) {
    setReingesting(filename);
    setError("");
    try {
      await reingestDocument(filename);
      setIngestedDocs((prev) => new Set([...prev, filename]));
      showToast(`"${filename}" re-indexed successfully!`);
    } catch (err) {
      showToast(err?.response?.data?.error || "Re-ingest failed", "error");
    } finally {
      setReingesting(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setAuthToken("");
    setToken("");
    setUsername("");
    setConversations([]);
    setActiveConversationId("");
    setMessages([]);
    setUploadedDocs([]);
    setIngestedDocs(new Set());
  }

  if (!token) return <AuthScreen onAuth={handleAuth} />;

  const hasIngestedDocs = ingestedDocs.size > 0;

  return (
    <div className="min-h-screen bg-slateMist p-4 md:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1280px] rounded-[24px] bg-white/65 shadow-cloud backdrop-blur-xl">

        {/* Sidebar */}
        <aside className="flex w-full max-w-[280px] flex-col rounded-l-[24px] border-r border-slate-200 bg-slate-50/90 p-4 md:p-6">
          <h1 className="mb-5 text-2xl font-extrabold tracking-[0.2em] text-slate-900">CHAT A.I+</h1>

          <button
            onClick={handleNewChat}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-soft"
          >
            <CirclePlus size={16} />
            New chat
          </button>

          {/* Conversations */}
          <p className="mb-2 text-xs font-medium text-slate-500">Conversations</p>
          <div className="scrollbar-thin mb-4 max-h-[28vh] flex-shrink-0 space-y-1 overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-400">No conversations yet</p>
            ) : (
              conversations.map((conversation) => {
                const active = conversation.conversation_id === activeConversationId;
                return (
                  <button
                    key={conversation.conversation_id}
                    onClick={() => setActiveConversationId(conversation.conversation_id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      active ? "border border-blue-200 bg-blue-50 text-blue-700" : "border border-transparent text-slate-700 hover:bg-white"
                    }`}
                  >
                    <MessageSquare size={14} className="flex-shrink-0" />
                    <span className="truncate">{conversation.title || "Untitled chat"}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* PDF Documents */}
          <div className="flex-1 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">PDF Knowledge Base</p>

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={ingesting}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              <FileUp size={16} />
              {ingesting ? "Uploading & indexing..." : "Upload PDF"}
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUploadPdf} className="hidden" />

            {/* Document list */}
            {uploadedDocs.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-2">No PDFs uploaded yet</p>
            ) : (
              <div className="space-y-2 max-h-[24vh] overflow-y-auto">
                {uploadedDocs.map((doc) => {
                  const isIngested = ingestedDocs.has(doc);
                  const isReingesting = reingesting === doc;
                  return (
                    <div key={doc} className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${isIngested ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                      <FileText size={14} className={`mt-0.5 flex-shrink-0 ${isIngested ? "text-green-600" : "text-amber-600"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-800" title={doc}>{doc}</p>
                        <p className={`text-[10px] ${isIngested ? "text-green-600" : "text-amber-600"}`}>
                          {isIngested ? "✓ Ready to query" : "⚠ Needs re-indexing"}
                        </p>
                      </div>
                      {!isIngested && (
                        <button
                          onClick={() => handleReingest(doc)}
                          disabled={isReingesting}
                          title="Re-index this document"
                          className="flex-shrink-0 rounded-lg p-1 text-amber-600 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <RotateCcw size={13} className={isReingesting ? "animate-spin" : ""} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom user section */}
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-white">
              <Settings size={15} />
              Settings
            </button>
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-pink-400 to-blue-500 text-xs font-semibold text-white">
                  {(username || "U").slice(0, 1).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-slate-800">{username}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="relative flex-1 rounded-r-[24px] bg-white/80 p-4 md:p-8">
          <div className="scrollbar-thin mb-24 h-[calc(100vh-8.5rem)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-6 shadow-soft">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
                <button onClick={() => setError("")} className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100"><X size={13} /></button>
              </div>
            )}

            {!messages.length && (
              <div className="flex h-full items-center justify-center text-center">
                {!hasIngestedDocs ? (
                  <div>
                    <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-blue-50 mx-auto">
                      <FileUp size={28} className="text-blue-400" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-slate-800">Upload a PDF to get started</h2>
                    <p className="text-sm text-slate-500 max-w-xs">
                      Use the sidebar to upload your PDF document, then ask anything about its contents.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-soft"
                    >
                      Upload PDF
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Ready</p>
                    <h2 className="text-2xl font-semibold text-slate-800">
                      {activeConversation?.title || "Ask anything about your documents"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {ingestedDocs.size} document{ingestedDocs.size !== 1 ? "s" : ""} indexed
                    </p>
                  </div>
                )}
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.created_at}-${index}`} className="mb-8">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {message.role === "assistant" ? "AI" : (username || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700">
                    {message.role === "assistant" ? "CHAT A.I+" : username}
                  </span>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${message.role === "assistant" ? "bg-slate-50" : "bg-blue-50"}`}>
                  {message.role === "assistant" ? (
                    <div>
                      <div className="space-y-2 text-sm leading-7 text-slate-700">
                        {formatAssistantMessage(message.content).map((line, lineIndex) => (
                          <p key={lineIndex}>{line}</p>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-slate-400">
                        <button className="hover:text-slate-700"><ThumbsUp size={16} /></button>
                        <button className="hover:text-slate-700"><ThumbsDown size={16} /></button>
                        <button
                          onClick={() => navigator.clipboard.writeText(message.content)}
                          title="Copy"
                          className="hover:text-slate-700"
                        >
                          <Copy size={16} />
                        </button>
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
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                Thinking...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="absolute bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-soft"
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={hasIngestedDocs ? "Ask anything about your documents..." : "Upload a PDF first to start chatting..."}
              disabled={!hasIngestedDocs || loading}
              className="flex-1 border-none bg-transparent px-3 py-2 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim() || !hasIngestedDocs}
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-soft disabled:opacity-50"
            >
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
