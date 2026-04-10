from flask import Flask, request, jsonify
import os
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

app = Flask(__name__)
app.register_blueprint(auth_bp)


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
        return jsonify({
            "conversation_id": conversation_id,
            "messages": messages,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/ingest', methods=['POST'])
@require_token
def ingest_document(username):
    try:
        file = request.files.get('file')
        
        if not file or file.filename == '':
            return jsonify({"error": "No file provided"}), 400
        
        if not file.filename.endswith('.pdf'):
            return jsonify({"error": "Only PDF files are supported"}), 400
        
        # Create user directory if needed
        user_upload_dir = f"data/uploads/{username}"
        os.makedirs(user_upload_dir, exist_ok=True)
        
        file_path = os.path.join(user_upload_dir, file.filename)
        file.save(file_path)
        
        result = run_ingestion_pipeline(file_path)
        
        return jsonify({
            "message": "Document ingested successfully",
            "user": username,
            "result": result
        }), 200
    
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
    app.run(debug=True, port=5000)
