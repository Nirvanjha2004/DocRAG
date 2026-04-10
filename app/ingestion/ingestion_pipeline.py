from .loader import load_pdf
from .chunking import chunk_documents
from .embedder import create_embeddings
from .store_to_db import store_embeddings
from app.config.db import init_db


def run_ingestion_pipeline(file_path):
    init_db()

    # Step 1: Load the PDF document
    document_stream = load_pdf(file_path)

    # Step 2 + 3 + 4: Process lazy-loaded pages in batches
    page_batch = []
    page_batch_size = 25
    embedder = create_embeddings()

    for document in document_stream:
        page_batch.append(document)
        if len(page_batch) < page_batch_size:
            continue

        chunks = chunk_documents(page_batch)
        chunk_texts = [chunk.page_content for chunk in chunks]
        embeddings = embedder.embed_documents(chunk_texts)
        store_embeddings(chunks, embeddings)
        page_batch = []

    if page_batch:
        chunks = chunk_documents(page_batch)
        chunk_texts = [chunk.page_content for chunk in chunks]
        embeddings = embedder.embed_documents(chunk_texts)
        store_embeddings(chunks, embeddings)
