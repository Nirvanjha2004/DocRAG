from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from app.config.db import get_client

api_key = os.getenv("GOOGLE_API_KEY")

def create_embeddings():
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    
    return GoogleGenerativeAIEmbeddings(api_key=api_key)


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
        chunks.append({
            "text" : er.payload["text"]
        })

    return chunks

def retrieve(query):
    query_embedding = get_embeddings(query)
    embedding_results = search_in_db(query_embedding)
    related_chunks = return_chunks(embedding_results)

    return related_chunks
