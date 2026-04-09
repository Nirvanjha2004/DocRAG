from app.config.db import get_client
import uuid
def store_embeddings(chunks, embeddings):
    client = get_client()
    for chunk, embedding in zip(chunks, embeddings):
        client.upsert(
            collection_name="documents",
            points=[
                {
                    "id": str(uuid.uuid4()),
                    "vector": embedding,
                    "payload": {
                        "text": chunk.page_content,
                        "source": chunk.metadata.get("source", "unknown")
                    }
                }
            ]
        )