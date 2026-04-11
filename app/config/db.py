from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

client = QdrantClient(":memory:")

def init_db():
    existing = [c.name for c in client.get_collections().collections]
    if "documents" not in existing:
        client.create_collection(
            collection_name="documents",
            vectors_config=VectorParams(size=768, distance=Distance.COSINE)
        )

def get_client():
    return client
