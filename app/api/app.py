from flask import Flask, request, jsonify
import os
from .auth import auth_bp
from .middleware import require_token
from app.main_pipeline import run_main_pipeline
from app.ingestion.ingestion_pipeline import run_ingestion_pipeline

app = Flask(__name__)
app.register_blueprint(auth_bp)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


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
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        result = run_main_pipeline(query)
        
        return jsonify({
            "query": query,
            "answer": result,
            "user": username
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
