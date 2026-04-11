from flask import Flask, request, jsonify
import os
import threading
import uuid as uuid_lib
from flask_cors import CORS
from .auth import auth_bp
from .middleware import require_token
from .chat_storage import (
    add_message,
    build_chat_history_text,
    create_conversation,
    get_conversation,
    get_messages,
    list_conversations,
)
from app.main_pipeline import run_main_pipeline
from app.ingestion.ingestion_pipeline import run_ingestion_pipeline
from app.config.db import init_db

app = Flask(__name__)
CORS(app)
app.register_blueprint(auth_bp)

with app.app_context():
    init_db()

# In-memory job store: job_id -> {status, progress, filename, message}
ingest_jobs = {}


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


@app.route('/api/conversations', methods=['POST'])
@require_token
def create_chat_conversation(username):
    try:
        data = request.get_json(silent=True) or {}
        title = data.get('title')
        conversation = create_conversation(username=username, title=title)
        return jsonify(conversation), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/conversations', methods=['GET'])
@require_token
def get_chat_conversations(username):
    try:
        conversations = list_conversations(username)
        return jsonify({"conversations": conversations}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
@require_token
def get_chat_messages(username, conversation_id):
    try:
        conversation = get_conversation(conversation_id, username=username)
        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404
        messages = get_messages(conversation_id)
        return jsonify({"conversation_id": conversation_id, "messages": messages}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/documents', methods=['GET'])
@require_token
def list_documents(username):
    try:
        user_upload_dir = f"data/uploads/{username}"
        if not os.path.exists(user_upload_dir):
            return jsonify({"documents": []}), 200
        files = sorted([f for f in os.listdir(user_upload_dir) if f.endswith('.pdf')])
        return jsonify({"documents": files}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/ingest', methods=['POST'])
@require_token
def ingest_document(username):
    try:
        files = request.files.getlist('files')
        if not files or all(f.filename == '' for f in files):
            return jsonify({"error": "No files provided"}), 400

        user_upload_dir = f"data/uploads/{username}"
        os.makedirs(user_upload_dir, exist_ok=True)

        jobs = []
        for file in files:
            if not file or not file.filename.endswith('.pdf'):
                continue
            file_path = os.path.join(user_upload_dir, file.filename)
            file.save(file_path)

            job_id = str(uuid_lib.uuid4())
            ingest_jobs[job_id] = {
                "status": "processing",
                "progress": 0,
                "filename": file.filename,
                "message": "Starting...",
            }
            jobs.append({"job_id": job_id, "filename": file.filename})

            def _run(fp=file_path, jid=job_id, fname=file.filename):
                def cb(pct, msg=""):
                    ingest_jobs[jid] = {"status": "processing", "progress": pct, "filename": fname, "message": msg}
                try:
                    run_ingestion_pipeline(fp, progress_callback=cb)
                    ingest_jobs[jid] = {"status": "done", "progress": 100, "filename": fname, "message": "Ready to query"}
                except Exception as ex:
                    ingest_jobs[jid] = {"status": "error", "progress": 0, "filename": fname, "message": str(ex)}

            threading.Thread(target=_run, daemon=True).start()

        if not jobs:
            return jsonify({"error": "No valid PDF files provided"}), 400

        return jsonify({"jobs": jobs}), 202

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/ingest/status/<job_id>', methods=['GET'])
@require_token
def ingest_status(username, job_id):
    job = ingest_jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job), 200


@app.route('/api/reingest', methods=['POST'])
@require_token
def reingest_document(username):
    try:
        data = request.get_json()
        filename = data.get('filename')
        if not filename:
            return jsonify({"error": "filename is required"}), 400
        file_path = os.path.join(f"data/uploads/{username}", filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        job_id = str(uuid_lib.uuid4())
        ingest_jobs[job_id] = {"status": "processing", "progress": 0, "filename": filename, "message": "Starting..."}

        def _run(fp=file_path, jid=job_id, fname=filename):
            def cb(pct, msg=""):
                ingest_jobs[jid] = {"status": "processing", "progress": pct, "filename": fname, "message": msg}
            try:
                run_ingestion_pipeline(fp, progress_callback=cb)
                ingest_jobs[jid] = {"status": "done", "progress": 100, "filename": fname, "message": "Ready to query"}
            except Exception as ex:
                ingest_jobs[jid] = {"status": "error", "progress": 0, "filename": fname, "message": str(ex)}

        threading.Thread(target=_run, daemon=True).start()
        return jsonify({"job_id": job_id, "filename": filename}), 202

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/query', methods=['POST'])
@require_token
def query_rag(username):
    try:
        data = request.get_json()
        query = data.get('query')
        conversation_id = data.get('conversation_id')

        if not query:
            return jsonify({"error": "Query is required"}), 400

        if conversation_id:
            conversation = get_conversation(conversation_id, username=username)
            if not conversation:
                return jsonify({"error": "Conversation not found"}), 404
        else:
            conversation = create_conversation(username=username, title=query[:40] or "New conversation")
            conversation_id = conversation["conversation_id"]

        add_message(conversation_id, "user", query)
        history_messages = get_messages(conversation_id)
        chat_history = build_chat_history_text(history_messages[:-1])

        result = run_main_pipeline(query, chat_history=chat_history)
        add_message(conversation_id, "assistant", result)

        return jsonify({
            "query": query,
            "answer": result,
            "user": username,
            "conversation_id": conversation_id,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=8000)
