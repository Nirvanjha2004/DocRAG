from functools import wraps
from flask import request, jsonify
from .auth import verify_token


def require_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({"error": "Missing authorization token"}), 401
        
        # Handle "Bearer <token>" format
        if token.startswith('Bearer '):
            token = token[7:]
        
        username = verify_token(token)
        if not username:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        return f(username=username, *args, **kwargs)
    
    return decorated_function
