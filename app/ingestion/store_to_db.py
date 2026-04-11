from app.config.db import get_client
from qdrant_client.models import PointStruct
import uuid

def store_embeddings(chunks, embeddings):
    client = get_client()
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "text": chunk.page_content,
                "source": chunk.metadata.get("source", "unknown")
            }
        )
        for chunk, embedding in zip(chunks, embeddings)
    ]
    client.upsert(
        collection_name="documents",
        points=points
    )
