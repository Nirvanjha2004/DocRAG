from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")

# Simple in-memory user store (replace with actual DB for production)
users = {}


@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({"error": "Missing required fields"}), 400
        
        if username in users:
            return jsonify({"error": "Username already exists"}), 409
        
        hashed_password = generate_password_hash(password)
        users[username] = {
            "email": email,
            "password": hashed_password,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return jsonify({
            "message": "User created successfully",
            "username": username,
            "email": email
        }), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"error": "Missing username or password"}), 400
        
        user = users.get(username)
        if not user or not check_password_hash(user['password'], password):
            return jsonify({"error": "Invalid credentials"}), 401
        
        token = jwt.encode(
            {
                'username': username,
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            JWT_SECRET,
            algorithm='HS256'
        )
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "username": username
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('username')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
