# DocRAG — Chat with your PDFs

DocRAG is a full-stack Retrieval-Augmented Generation (RAG) application that lets you upload multiple PDF documents and have a natural language conversation across all of them simultaneously.

---

## Features

- **Multi-PDF support** — Upload multiple PDFs and query across all of them in a single chat
- **Fast background ingestion** — Large PDFs are processed in background threads with parallel embedding batches; real-time progress bars show indexing status
- **Vector search** — Qdrant (in-memory) for accurate semantic retrieval
- **Conversation history** — Full multi-turn chat with context passed to the LLM
- **User authentication** — JWT-based signup/login
- **Re-index on demand** — One-click re-index button re-ingests saved PDFs after a server restart
- **Groq LLM** — Uses `llama-3.3-70b-versatile` via Groq for fast, free-tier-friendly responses
- **Google Embeddings** — `gemini-embedding-001` (3072-dim) for high-quality semantic search

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Axios |
| Backend | Python, Flask, Flask-CORS |
| LLM | Groq API (`llama-3.3-70b-versatile`) |
| Embeddings | Google Generative AI (`gemini-embedding-001`) |
| Vector Store | Qdrant (in-memory) |
| Auth | JWT (PyJWT) |
| PDF Parsing | pypdf, LangChain Community |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── app.py              # Flask routes (ingest, query, auth, documents)
│   │   ├── auth.py             # Signup/login with JWT
│   │   ├── chat_storage.py     # In-memory conversation store
│   │   └── middleware.py       # JWT token verification
│   ├── config/
│   │   └── db.py               # Qdrant in-memory client + collection init
│   ├── generator/
│   │   └── llm.py              # Groq LLM answer generation
│   ├── ingestion/
│   │   ├── ingestion_pipeline.py  # Parallel batch ingestion with progress tracking
│   │   ├── loader.py           # PDF loader (pypdf)
│   │   ├── chunking.py         # Text splitting
│   │   ├── embedder.py         # Google embedding model
│   │   └── store_to_db.py      # Qdrant upsert with PointStruct
│   ├── retrival/
│   │   └── retrieve_query.py   # Vector search + chunk retrieval
│   └── main_pipeline.py        # Retrieve → Generate orchestration
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React UI
│   │   ├── api.js              # Axios client (proxied to backend)
│   │   └── main.jsx            # React entry point
│   ├── vite.config.js          # Vite + proxy config (port 5000)
│   └── package.json
├── run_server.py               # Flask server entry point (port 8000)
├── requirements.txt
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- A [Google AI API key](https://aistudio.google.com/app/apikey) (for embeddings — free)
- A [Groq API key](https://console.groq.com/keys) (for LLM chat — free tier)

### 1. Clone the repository

```bash
git clone https://github.com/Nirvanjha2004/DocRAG.git
cd DocRAG
```

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend && npm install
```

### 4. Set environment variables

Create a `.env` file in the project root or export in your shell:

```env
GOOGLE_API_KEY=your_google_ai_api_key
GROQ_API_KEY=your_groq_api_key
```

### 5. Run the application

**Backend** (port 8000):
```bash
python run_server.py
```

**Frontend** (port 5000):
```bash
cd frontend && npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## How It Works

1. **Upload** — Select one or more PDF files via the sidebar. Files are saved to `data/uploads/<username>/`
2. **Ingestion** — Each PDF is loaded, chunked into 800-char pieces, and embedded in parallel background threads. A real-time progress bar shows status per file
3. **Search** — On a query, your question is embedded and used to find the most semantically similar chunks from **all** indexed documents
4. **Answer** — Retrieved chunks + conversation history are sent to Groq's LLaMA model which generates a context-aware response

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/documents` | List uploaded PDFs |
| POST | `/api/ingest` | Upload + start background indexing (multi-file) |
| GET | `/api/ingest/status/<job_id>` | Poll indexing progress |
| POST | `/api/reingest` | Re-index an already-uploaded PDF |
| POST | `/api/conversations` | Create a new conversation |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/<id>/messages` | Get messages in a conversation |
| POST | `/api/query` | Ask a question (RAG) |

---

## Notes

- **In-memory vector store** — Qdrant runs in-memory. Indexed documents are lost on server restart. Use the **Re-index** (↺) button in the sidebar to re-ingest your uploaded PDFs
- **Large PDFs** — Pages are batched (40 pages/batch) with up to 3 parallel embedding calls. A 500-page PDF typically takes 2–5 minutes depending on Google Embedding API rate limits

---

## License

MIT
