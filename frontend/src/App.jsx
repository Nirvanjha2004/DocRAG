import { useEffect, useMemo, useRef, useState } from "react";
import {
  CirclePlus,
  Search,
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
} from "lucide-react";
import {
  createConversation,
  getConversations,
  getMessages,
  ingestPdf,
  login,
  queryRag,
  setAuthToken,
  signup,
} from "./api";

function formatAssistantMessage(content) {
  const lines = String(content || "").split("\n").filter((line) => line.trim().length > 0);
  return lines;
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
        const items = await getConversations();
        setConversations(items);
        if (items.length > 0) {
          setActiveConversationId(items[0].conversation_id);
        }
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load conversations");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !activeConversationId) {
      setMessages([]);
      return;
    }
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
    setError("");
    setLoading(true);

    const localUserMessage = {
      role: "user",
      content: prompt,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, localUserMessage]);

    const currentPrompt = prompt;
    setPrompt("");

    try {
      const response = await queryRag({
        query: currentPrompt,
        conversationId: activeConversationId || null,
      });

      if (!activeConversationId && response.conversation_id) {
        const items = await getConversations();
        setConversations(items);
        setActiveConversationId(response.conversation_id);
      }

      const localAssistantMessage = {
        role: "assistant",
        content: response.answer,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, localAssistantMessage]);
    } catch (err) {
      setError(err?.response?.data?.error || "Query failed");
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
    } catch (err) {
      setError(err?.response?.data?.error || "Ingestion failed");
    } finally {
      setIngesting(false);
      event.target.value = "";
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
  }

  if (!token) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-slateMist p-4 md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1280px] rounded-[24px] bg-white/65 shadow-cloud backdrop-blur-xl">
        <aside className="w-full max-w-[280px] rounded-l-[24px] border-r border-slate-200 bg-slate-50/90 p-4 md:p-6">
          <h1 className="mb-5 text-2xl font-extrabold tracking-[0.2em] text-slate-900">CHAT A.I+</h1>

          <div className="mb-5 flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-soft"
            >
              <CirclePlus size={16} />
              New chat
            </button>
            <button className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-700 shadow-soft">
              <Search size={18} />
            </button>
          </div>

          <p className="mb-3 text-xs font-medium text-slate-500">Your conversations</p>

          <div className="scrollbar-thin max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {conversations.map((conversation) => {
              const active = conversation.conversation_id === activeConversationId;
              return (
                <button
                  key={conversation.conversation_id}
                  onClick={() => setActiveConversationId(conversation.conversation_id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border border-blue-200 bg-blue-50 text-blue-700"
                      : "border border-transparent text-slate-700 hover:bg-white"
                  }`}
                >
                  <MessageSquare size={14} />
                  <span className="truncate">{conversation.title || "Untitled chat"}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <p className="mb-2 text-xs text-slate-500">Add your PDF knowledge</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={ingesting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              <FileUp size={16} />
              {ingesting ? "Uploading..." : "Upload PDF"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleUploadPdf}
              className="hidden"
            />
          </div>

          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
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

        <main className="relative flex-1 rounded-r-[24px] bg-white/80 p-4 md:p-8">
          <div className="scrollbar-thin mb-24 h-[calc(100vh-8.5rem)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-6 shadow-soft">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {!messages.length && (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Conversation</p>
                  <h2 className="text-2xl font-semibold text-slate-800">
                    {activeConversation?.title || "Start a new chat"}
                  </h2>
                </div>
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
                      <h3 className="mb-2 text-base font-bold text-slate-900">Here is what I found:</h3>
                      <div className="space-y-2 text-sm leading-7 text-slate-700">
                        {formatAssistantMessage(message.content).map((line, lineIndex) => (
                          <p key={lineIndex}>{line}</p>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-slate-400">
                        <button className="hover:text-slate-700"><ThumbsUp size={16} /></button>
                        <button className="hover:text-slate-700"><ThumbsDown size={16} /></button>
                        <button className="hover:text-slate-700"><Copy size={16} /></button>
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
              <div className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
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
              placeholder="What's in your mind..."
              className="flex-1 border-none bg-transparent px-3 py-2 text-sm text-slate-700 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
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
