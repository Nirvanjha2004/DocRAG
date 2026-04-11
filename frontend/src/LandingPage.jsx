import { useState, useEffect } from "react";
import {
  Brain,
  Zap,
  MessageSquare,
  FileText,
  Shield,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ─── Keyframe animations injected once ─── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes typingDots {
    0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
    30%            { opacity: 1;   transform: translateY(-4px); }
  }
  @keyframes typing {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes pulse-slow {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .animate-fade-in   { animation: fadeIn 0.6s ease forwards; }
  .animate-slide-up  { animation: slideUp 0.7s ease forwards; }
  .animate-slide-up-delay-1 { animation: slideUp 0.7s 0.1s ease both; }
  .animate-slide-up-delay-2 { animation: slideUp 0.7s 0.2s ease both; }
  .animate-slide-up-delay-3 { animation: slideUp 0.7s 0.3s ease both; }
  .animate-slide-up-delay-4 { animation: slideUp 0.7s 0.4s ease both; }
  .animate-slide-right { animation: slideRight 0.6s ease forwards; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }

  .typing-cursor::after {
    content: '|';
    animation: blink 1s step-end infinite;
  }

  .gradient-text {
    background: linear-gradient(135deg, #8b5cf6, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .gradient-text-animated {
    background: linear-gradient(135deg, #8b5cf6, #06b6d4, #8b5cf6);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradientShift 3s ease infinite;
  }
  .gradient-btn {
    background: linear-gradient(135deg, #7c3aed, #0891b2);
    transition: opacity 0.2s, transform 0.2s;
  }
  .gradient-btn:hover { opacity: 0.9; transform: translateY(-1px); }

  .glass {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .glass-hover:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.18);
    transform: translateY(-2px);
    transition: all 0.25s ease;
  }

  .dot-typing span {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #8b5cf6;
    margin: 0 2px;
    animation: typingDots 1.2s ease-in-out infinite;
  }
  .dot-typing span:nth-child(2) { animation-delay: 0.2s; }
  .dot-typing span:nth-child(3) { animation-delay: 0.4s; }

  html { scroll-behavior: smooth; }
`;

/* ─── Reusable gradient badge ─── */
function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
      {children}
    </span>
  );
}

/* ─── Glass card ─── */
function GlassCard({ children, className = "" }) {
  return (
    <div className={`glass rounded-2xl p-6 transition-all duration-300 glass-hover ${className}`}>
      {children}
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 text-xl font-extrabold">
          <span>🧠</span>
          <span className="gradient-text">DocRAG</span>
        </a>

        {/* Nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {[
            { label: "Features", href: "#features" },
            { label: "How it Works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onGetStarted}
          className="gradient-btn rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Start for Free
        </button>
      </div>
    </nav>
  );
}

/* ─── Animated chat bubble (hero) ─── */
function HeroChatUI() {
  const [showAiMsg, setShowAiMsg] = useState(false);
  const [showSecondUser, setShowSecondUser] = useState(false);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => { setTyping(false); setShowAiMsg(true); }, 2000);
    const t2 = setTimeout(() => setShowSecondUser(true), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="glass animate-float rounded-2xl p-0 overflow-hidden w-full max-w-sm mx-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-bold text-white">
          D
        </div>
        <div>
          <p className="text-sm font-semibold text-white">DocRAG</p>
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-slow" />
            3 PDFs loaded
          </p>
        </div>
        <div className="ml-auto flex gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 p-4">
        {/* User message */}
        <div className="flex justify-end animate-slide-up">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600/80 px-3 py-2 text-xs text-white">
            What's the main argument in chapter 3?
            <p className="mt-1 text-right text-[10px] text-violet-300">10:42 AM</p>
          </div>
        </div>

        {/* AI typing or response */}
        {typing ? (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-white">
              AI
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-3 py-2">
              <div className="dot-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        ) : showAiMsg ? (
          <div className="flex items-end gap-2 animate-slide-up">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-white">
              AI
            </div>
            <div className="glass max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-slate-200">
              Based on your research paper, chapter 3 argues that...{" "}
              <span className="text-cyan-400">[source: paper.pdf, p.47]</span>
              <p className="mt-1 text-[10px] text-slate-500">10:42 AM</p>
            </div>
          </div>
        ) : null}

        {/* Second user message */}
        {showSecondUser && (
          <div className="flex justify-end animate-slide-up">
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600/80 px-3 py-2 text-xs text-white">
              Explain this like I didn't sleep for 2 days
              <p className="mt-1 text-right text-[10px] text-violet-300">10:43 AM</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 bg-white/5 px-4 py-2 text-center text-[10px] text-slate-500">
        Scanning your PDFs so you don't have to ✨
      </div>
    </div>
  );
}

/* ─── Hero Section ─── */
function HeroSection({ onGetStarted }) {
  return (
    <section className="relative min-h-screen overflow-hidden pt-24 pb-16">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
        {/* Left: copy */}
        <div>
          <div className="mb-6 animate-slide-up">
            <Badge>
              <Sparkles size={12} />
              Powered by RAG + LLMs
            </Badge>
          </div>

          <h1 className="animate-slide-up-delay-1 mb-6 text-5xl font-black leading-tight tracking-tight text-white md:text-6xl">
            Stop scrolling PDFs.
            <br />
            <span className="gradient-text-animated">Start talking to them.</span>
          </h1>

          <p className="animate-slide-up-delay-2 mb-8 max-w-lg text-lg text-slate-400">
            Upload PDFs and ask anything. Get answers with context, not guesses.
          </p>

          <div className="animate-slide-up-delay-3 flex flex-wrap gap-3">
            <button
              onClick={onGetStarted}
              className="gradient-btn flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-lg"
            >
              Upload &amp; Try Free <ArrowRight size={16} />
            </button>
            <a
              href="#demo"
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              See Demo <ChevronRight size={16} />
            </a>
          </div>

          <p className="animate-slide-up-delay-4 mt-6 text-sm text-slate-500">
            Trusted by students, devs &amp; researchers
          </p>
        </div>

        {/* Right: chat UI */}
        <div className="flex justify-center animate-fade-in">
          <HeroChatUI />
        </div>
      </div>
    </section>
  );
}

/* ─── Problem Section ─── */
function ProblemSection() {
  const pains = [
    {
      emoji: "😤",
      title: "Ctrl+F doesn't understand context",
      desc: "You search 'revenue' and get 847 matches. Cool.",
    },
    {
      emoji: "📚",
      title: "You read 50 pages to find 2 lines",
      desc: "The answer was on page 3. You found it on page 49.",
    },
    {
      emoji: "🗂️",
      title: "Multiple PDFs = chaos",
      desc: "Tab 1: paper. Tab 2: notes. Tab 3: existential dread.",
    },
  ];

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-4xl font-bold text-white">
          Sound familiar?
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {pains.map((p) => (
            <GlassCard key={p.title}>
              <div className="mb-4 text-4xl">{p.emoji}</div>
              <h3 className="mb-2 font-semibold text-white">{p.title}</h3>
              <p className="text-sm text-slate-400">{p.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works Section ─── */
function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Upload PDFs",
      desc: "Drop one or a hundred. We handle it.",
      icon: <FileText size={22} />,
    },
    {
      n: "02",
      title: "We index them",
      desc: "Chunked, embedded, vectorized. Fancy words for 'we actually read it'.",
      icon: <Brain size={22} />,
    },
    {
      n: "03",
      title: "Ask anything",
      desc: "Plain English. No boolean operators required.",
      icon: <MessageSquare size={22} />,
    },
    {
      n: "04",
      title: "Get answers",
      desc: "With sources. Not hallucinations.",
      icon: <Sparkles size={22} />,
    },
  ];

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-16 text-center text-4xl font-bold text-white">
          From PDF to answer in seconds
        </h2>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.n} className="relative flex flex-col items-center text-center">
              {/* Connector arrow */}
              {i < steps.length - 1 && (
                <div className="absolute top-8 left-[calc(50%+2.5rem)] hidden w-[calc(100%-5rem)] items-center md:flex">
                  <div className="h-px flex-1 bg-gradient-to-r from-violet-500/50 to-cyan-400/50" />
                  <ChevronRight size={14} className="text-cyan-400/60" />
                </div>
              )}

              <div className="glass mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-violet-400">
                {step.icon}
              </div>
              <span className="mb-1 font-mono text-xs font-bold text-violet-500">{step.n}</span>
              <h3 className="mb-2 font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features Section ─── */
function FeaturesSection() {
  const features = [
    {
      icon: <FileText size={20} />,
      emoji: "📄",
      title: "Multi-PDF Chat",
      desc: "Ask across all your documents simultaneously. Yes, all of them.",
    },
    {
      icon: <Zap size={20} />,
      emoji: "⚡",
      title: "Background Processing",
      desc: "Upload and go. We index while you procrastinate.",
    },
    {
      icon: <Brain size={20} />,
      emoji: "🧠",
      title: "Semantic Search",
      desc: "Understands meaning, not just keywords. Big difference.",
    },
    {
      icon: <MessageSquare size={20} />,
      emoji: "💬",
      title: "Conversation Memory",
      desc: "Remembers what you asked 5 messages ago. Unlike you.",
    },
    {
      icon: <RefreshCw size={20} />,
      emoji: "🔄",
      title: "Re-index Anytime",
      desc: "Updated your doc? Re-index in one click.",
    },
    {
      icon: <Shield size={20} />,
      emoji: "🔐",
      title: "Secure Auth",
      desc: "Your PDFs stay yours. We're not that interested in your thesis.",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-4 text-center text-4xl font-bold text-white">
          Everything you need. Nothing you don't.
        </h2>
        <p className="mb-12 text-center text-slate-400">
          Built lean. Runs fast. Does exactly what it says.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <GlassCard key={f.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white">{f.title}</h3>
              </div>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Demo Section ─── */
function DemoSection() {
  const pdfs = [
    { name: "research_paper.pdf", ready: true },
    { name: "lecture_notes.pdf", ready: true },
    { name: "thesis_draft.pdf", ready: true },
  ];

  const messages = [
    {
      role: "user",
      text: "Summarize the key findings from the research paper",
    },
    {
      role: "ai",
      text: "The research paper identifies 3 key findings:\n[1] Neural retrieval outperforms BM25 on long-form queries by 34%\n[2] Chunking strategy significantly impacts answer quality\n[3] Hybrid search yields best precision-recall tradeoff\n— Source: research_paper.pdf, pp. 12-15",
      source: "research_paper.pdf, pp. 12-15",
    },
    {
      role: "user",
      text: "How does this relate to my thesis?",
    },
    {
      role: "ai",
      text: "Cross-referencing with thesis_draft.pdf... Your thesis on p.8 aligns with finding #2, specifically your argument about semantic chunking improving retrieval precision. You might want to cite section 4.2 of the paper directly.",
      source: "thesis_draft.pdf, p.8",
    },
  ];

  return (
    <section id="demo" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-4xl font-bold text-white">
          See it in action
        </h2>

        <div className="glass overflow-hidden rounded-2xl shadow-2xl">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 font-mono text-xs text-slate-500">DocRAG — Demo</span>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full border-b border-white/10 bg-white/3 p-4 md:w-56 md:border-b-0 md:border-r">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Documents
              </p>
              <div className="space-y-2">
                {pdfs.map((pdf) => (
                  <div
                    key={pdf.name}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs"
                  >
                    <FileText size={13} className="flex-shrink-0 text-violet-400" />
                    <span className="truncate text-slate-300">{pdf.name}</span>
                    {pdf.ready && (
                      <Check size={11} className="ml-auto flex-shrink-0 text-green-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex flex-1 flex-col p-5">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "items-start gap-3"}`}
                  >
                    {msg.role === "ai" && (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-white">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 font-mono text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-tr-sm bg-violet-600/70 text-white"
                          : "rounded-tl-sm bg-white/8 text-slate-200 glass"
                      }`}
                      style={msg.role === "ai" ? { background: "rgba(255,255,255,0.06)" } : {}}
                    >
                      {msg.text.split("\n").map((line, j) => (
                        <p key={j}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Source callout */}
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-300">
                <span>📎</span>
                <span>
                  Cited from:{" "}
                  <span className="font-semibold">research_paper.pdf — Page 14</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Use Cases Section ─── */
function UseCasesSection() {
  const personas = [
    {
      emoji: "🎓",
      title: "Students",
      desc: "Revise 100-page notes in minutes. Your GPA will thank you.",
    },
    {
      emoji: "👨‍💻",
      title: "Developers",
      desc: "Search docs like StackOverflow on steroids. No more RTFM shame.",
    },
    {
      emoji: "⚖️",
      title: "Professionals",
      desc: "Extract key clauses instantly. Bill fewer hours on Ctrl+F.",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-4xl font-bold text-white">
          Built for people who read too much
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {personas.map((p) => (
            <GlassCard key={p.title} className="text-center">
              <div className="mb-4 text-5xl">{p.emoji}</div>
              <h3 className="mb-2 text-lg font-bold text-white">{p.title}</h3>
              <p className="text-sm text-slate-400">{p.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Comparison Table Section ─── */
function ComparisonSection() {
  const rows = [
    { old: "Scroll + Ctrl+F", new: "Ask a question" },
    { old: "Keyword matching", new: "Semantic understanding" },
    { old: "Manual cross-referencing", new: "Instant cross-doc answers" },
    { old: "No memory", new: "Context-aware conversation" },
    { old: "Read everything", new: "Find exactly what you need" },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="mb-12 text-center text-4xl font-bold text-white">
          The old way vs. the DocRAG way
        </h2>

        <div className="glass overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="grid grid-cols-2 border-b border-white/10">
            <div className="flex items-center gap-2 border-r border-white/10 px-6 py-4">
              <X size={16} className="text-red-400" />
              <span className="font-semibold text-slate-400">Traditional</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-4">
              <Check size={16} className="text-green-400" />
              <span className="gradient-text font-semibold">DocRAG</span>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 ${i < rows.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <div className="border-r border-white/5 px-6 py-4 text-sm text-slate-500">
                {row.old}
              </div>
              <div className="px-6 py-4 text-sm font-medium text-green-400">
                {row.new}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Tech Cred Strip ─── */
function TechCredSection() {
  const pills = [
    "Vector Embeddings",
    "LLM-Powered",
    "Parallel Ingestion",
    "Semantic Retrieval",
  ];

  return (
    <section className="py-16">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 flex flex-wrap justify-center gap-3">
          {pills.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 font-mono text-xs font-medium text-violet-300"
            >
              {pill}
            </span>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          Built on the same tech powering enterprise AI. Just without the enterprise price tag.
        </p>
      </div>
    </section>
  );
}

/* ─── Pricing Section ─── */
function PricingSection({ onGetStarted }) {
  const freeTier = [
    "3 PDFs max",
    "50 queries / month",
    "Standard processing",
  ];
  const proTier = [
    "Unlimited PDFs",
    "Unlimited queries",
    "Priority processing",
    "Conversation history",
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="mb-4 text-center text-4xl font-bold text-white">
          Simple pricing. No surprises.
        </h2>
        <p className="mb-12 text-center text-slate-400">
          Start free. Upgrade when you're ready.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <GlassCard className="flex flex-col">
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-400">
              Free
            </p>
            <p className="mb-6 text-4xl font-black text-white">
              $0
              <span className="text-base font-normal text-slate-500"> / mo</span>
            </p>
            <ul className="mb-8 flex-1 space-y-3">
              {freeTier.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check size={15} className="flex-shrink-0 text-green-400" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={onGetStarted}
              className="w-full rounded-full border border-white/20 bg-white/5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Start Free
            </button>
          </GlassCard>

          {/* Pro */}
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="gradient-btn rounded-full px-4 py-1 text-xs font-bold text-white shadow-lg">
                Most Popular
              </span>
            </div>
            <GlassCard
              className="flex flex-col border-violet-500/40"
              style={{ borderColor: "rgba(139,92,246,0.4)" }}
            >
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-violet-400">
                Pro
              </p>
              <p className="mb-6 text-4xl font-black text-white">
                $12
                <span className="text-base font-normal text-slate-500"> / mo</span>
              </p>
              <ul className="mb-8 flex-1 space-y-3">
                {proTier.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check size={15} className="flex-shrink-0 text-violet-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className="gradient-btn w-full rounded-full py-3 font-semibold text-white shadow-lg"
              >
                Go Pro
              </button>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA Section ─── */
function FinalCTASection({ onGetStarted }) {
  return (
    <section className="py-32">
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        </div>

        <h2 className="mb-4 text-5xl font-black text-white md:text-6xl">
          Your PDFs are full of answers.
        </h2>
        <p className="mb-10 text-xl text-slate-400">
          You just need a better way to ask.
        </p>
        <button
          onClick={onGetStarted}
          className="gradient-btn inline-flex items-center gap-2 rounded-full px-10 py-4 text-lg font-bold text-white shadow-2xl"
        >
          Start Chatting <ArrowRight size={20} />
        </button>
        <p className="mt-5 text-sm text-slate-600">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo + tagline */}
          <div>
            <p className="mb-1 text-lg font-extrabold">
              <span>🧠 </span>
              <span className="gradient-text">DocRAG</span>
            </p>
            <p className="text-sm text-slate-500">Chat with your PDFs</p>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
            <a href="#" className="transition hover:text-white">GitHub</a>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-slate-600">
          © 2025 DocRAG. Made with ☕ and too many PDFs.
        </div>
      </div>
    </footer>
  );
}

/* ─── Root LandingPage component ─── */
export default function LandingPage({ onGetStarted }) {
  return (
    <div
      className="min-h-screen font-sans text-white"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <Navbar onGetStarted={onGetStarted} />
      <HeroSection onGetStarted={onGetStarted} />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DemoSection />
      <UseCasesSection />
      <ComparisonSection />
      <TechCredSection />
      <PricingSection onGetStarted={onGetStarted} />
      <FinalCTASection onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}
