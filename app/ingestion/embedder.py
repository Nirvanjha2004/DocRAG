from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

api_key = os.getenv("GOOGLE_API_KEY")

def create_embeddings():
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    
    return GoogleGenerativeAIEmbeddings(api_key=api_key)

def embed_documents(documents):
    embedder = create_embeddings()
    return embedder.embed_documents(documents)