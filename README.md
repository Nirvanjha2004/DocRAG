# DocRAG - Document RAG with Authentication

This is a document retrieval and generation system with user authentication.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
set GOOGLE_API_KEY=your_google_api_key
set JWT_SECRET=your_jwt_secret_key
```

3. Start Qdrant database (if not already running):
```bash
docker run -p 6333:6333 qdrant/qdrant
```

4. Run the server:
```bash
python run_server.py
```

## API Endpoints

### Authentication

**Sign up:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "email": "john@example.com", "password": "pass123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "pass123"}'
```

### RAG Operations (Requires Token)

**Ingest PDF:**
```bash
curl -X POST http://localhost:5000/api/ingest \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@document.pdf"
```

**Query:**
```bash
curl -X POST http://localhost:5000/api/query \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this document about?"}'
```

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

## Features

- User signup and login with JWT tokens (24-hour expiry)
- Password hashing with werkzeug
- Protected RAG endpoints requiring authentication
- Per-user document uploads to `data/uploads/{username}/`
- Lazy-loaded PDF ingestion with batched processing
- Vector and BM25 hybrid search retrieval
- LLM-powered answer generation with Google Gemini
