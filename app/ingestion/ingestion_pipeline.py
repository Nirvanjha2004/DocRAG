from .loader import load_pdf
from .chunking import chunk_documents
from .embedder import create_embeddings

def run_ingestion_pipeline(file_path):
    # Step 1: Load the PDF document
    documents = load_pdf(file_path)

    # Step 2: Chunk the documents into smaller pieces
    chunks = chunk_documents(documents)

    # Step 3: Create embeddings for the chunks
    embedder = create_embeddings()
    embeddings = embedder.embed_documents(chunks)

    return embeddings