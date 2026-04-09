from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

client = QdrantClient("localhost", port=6333)

def init_db():
    client.recreate_collection(
        collection_name="documents",
        vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
    )

def get_client():
    return client