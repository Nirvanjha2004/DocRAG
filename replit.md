# DocRAG - Document RAG Chatbot

## Overview
DocRAG is a Document Retrieval-Augmented Generation (RAG) system that allows users to upload PDF documents and interact with them through a conversational interface. It features user authentication, vector search, and Google Gemini AI for answer generation.

## Architecture

### Backend (Flask - port 8000)
- **Framework:** Flask (Python)
- **LLM:** Google Gemini 1.5 Flash via LangChain Google GenAI
- **Vector Store:** Qdrant (in-memory mode for development)
- **Authentication:** JWT tokens with in-memory user store
- **Entry point:** `run_server.py` → `app/api/app.py`

### Frontend (React + Vite - port 5000)
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios (uses relative URLs, proxied to backend)
- **Entry point:** `frontend/src/main.jsx`

## Project Structure
```
app/
  api/          # Flask routes (app.py, auth.py, middleware.py, chat_storage.py)
  config/       # Qdrant database connection (db.py)
  generator/    # LLM response generation (llm.py)
  ingestion/    # PDF processing pipeline (loader, chunking, embedder, store_to_db)
  retrival/     # Vector search (retrieve_query.py)
  main_pipeline.py  # Orchestrates retrieval + generation
frontend/
  src/
    App.jsx     # Main UI
    api.js      # Axios client (uses relative URLs, proxied via Vite)
    main.jsx    # React entry point
run_server.py   # Flask server entry point
requirements.txt
```

## Workflows
- **Start application** - Vite dev server on port 5000 (`cd frontend && npm run dev`)
- **Backend** - Flask API on port 8000 (`python run_server.py`)

## Key Configuration
- Vite proxies `/api` requests to `http://localhost:8000` (backend)
- Frontend uses `allowedHosts: true` and `host: 0.0.0.0` for Replit proxy compatibility
- Qdrant runs in-memory mode (data lost on restart)
- Vector embeddings use Google's `embedding-001` model (768 dimensions)

## Environment Variables Required
- `GOOGLE_API_KEY` - Google AI API key for Gemini LLM and embeddings

## Key Fixes Applied During Import
1. `qdrant-client==2.7.0` doesn't exist; updated to `>=1.17.0`
2. `recreate_collection` removed in qdrant-client 1.x; replaced with `create_collection` with existence check
3. Switched Qdrant to in-memory mode (no external server needed)
4. `langchain.schema.Document` moved to `langchain_core.documents.Document`
5. `langchain.prompts` moved to `langchain_core.prompts`
6. `langchain.chains` removed; rewrote LLM chain using `prompt | llm` pattern
7. `langchain.text_splitter` moved to `langchain_text_splitters`
8. Vite configured with `host: 0.0.0.0`, `allowedHosts: true`, port 5000
9. Backend proxy added in Vite config (`/api` → `localhost:8000`)
10. Frontend API uses relative URLs instead of hardcoded `localhost:5000`
