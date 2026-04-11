from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os


def create_embeddings():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=api_key,
    )

def embed_documents(documents):
    embedder = create_embeddings()
    return embedder.embed_documents(documents)