from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from app.config.db import get_client
from langchain_core.documents import Document


def create_embeddings():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    
    return GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key,
    )


def get_embeddings(query):
    embedder = create_embeddings()
    return embedder.embed_query(query)

def search_in_db(query_embedding, top_k=5):
    client = get_client()
    results = client.search(
        collection_name = "documents", 
        query_vector = query_embedding, 
        limit = top_k
    )

    return results

def return_chunks(embedding_results):
    chunks = []
    for er in embedding_results:
        payload = er.payload or {}
        chunks.append(
            Document(
                page_content=payload.get("text", ""),
                metadata={
                    "source": payload.get("source", "unknown"),
                },
            )
        )

    return chunks

def retrieve(query):
    query_embedding = get_embeddings(query)
    embedding_results = search_in_db(query_embedding)
    related_chunks = return_chunks(embedding_results)

    return related_chunks


def retrive(query):
    return retrieve(query)
