import json
import os
import uuid
from datetime import datetime, timezone

BASE_CHAT_DIR = os.path.join("data", "chat")
CONVERSATIONS_FILE = os.path.join(BASE_CHAT_DIR, "conversations.json")
MESSAGES_DIR = os.path.join(BASE_CHAT_DIR, "messages")


def _utc_now():
    return datetime.now(timezone.utc).isoformat()


def _ensure_storage_dirs():
    os.makedirs(MESSAGES_DIR, exist_ok=True)
    if not os.path.exists(CONVERSATIONS_FILE):
        with open(CONVERSATIONS_FILE, "w", encoding="utf-8") as file:
            json.dump([], file)


def _read_json_file(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _write_json_file(path, data):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def _conversation_path(conversation_id):
    return os.path.join(MESSAGES_DIR, f"{conversation_id}.json")


def create_conversation(username, title=None):
    _ensure_storage_dirs()
    conversations = _read_json_file(CONVERSATIONS_FILE, [])

    conversation_id = str(uuid.uuid4())
    conversation = {
        "conversation_id": conversation_id,
        "username": username,
        "title": title or "New conversation",
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    conversations.append(conversation)
    _write_json_file(CONVERSATIONS_FILE, conversations)
    _write_json_file(_conversation_path(conversation_id), [])
    return conversation


def list_conversations(username):
    _ensure_storage_dirs()
    conversations = _read_json_file(CONVERSATIONS_FILE, [])
    return [conversation for conversation in conversations if conversation.get("username") == username]


def get_conversation(conversation_id, username=None):
    _ensure_storage_dirs()
    conversations = _read_json_file(CONVERSATIONS_FILE, [])
    for conversation in conversations:
        if conversation.get("conversation_id") == conversation_id:
            if username is not None and conversation.get("username") != username:
                return None
            return conversation
    return None


def add_message(conversation_id, role, content):
    _ensure_storage_dirs()
    messages_path = _conversation_path(conversation_id)
    messages = _read_json_file(messages_path, [])
    message = {
        "role": role,
        "content": content,
        "created_at": _utc_now(),
    }
    messages.append(message)
    _write_json_file(messages_path, messages)

    conversations = _read_json_file(CONVERSATIONS_FILE, [])
    for conversation in conversations:
        if conversation.get("conversation_id") == conversation_id:
            conversation["updated_at"] = _utc_now()
            break
    _write_json_file(CONVERSATIONS_FILE, conversations)
    return message


def get_messages(conversation_id):
    _ensure_storage_dirs()
    return _read_json_file(_conversation_path(conversation_id), [])


def build_chat_history_text(messages, max_messages=10):
    if not messages:
        return ""

    recent_messages = messages[-max_messages:]
    lines = []
    for message in recent_messages:
        role = message.get("role", "unknown")
        content = message.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)
