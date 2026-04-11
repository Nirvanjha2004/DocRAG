from .loader import load_pdf
from .chunking import chunk_documents
from .embedder import create_embeddings
from .store_to_db import store_embeddings
from app.config.db import init_db
from concurrent.futures import ThreadPoolExecutor, as_completed


def _embed_and_store(batch, embedder):
    chunks = chunk_documents(batch)
    if not chunks:
        return 0
    texts = [c.page_content for c in chunks]
    embeddings = embedder.embed_documents(texts)
    store_embeddings(chunks, embeddings)
    return len(chunks)


def run_ingestion_pipeline(file_path, progress_callback=None):
    init_db()

    if progress_callback:
        progress_callback(2, "Loading PDF...")

    all_pages = list(load_pdf(file_path))
    total_pages = len(all_pages)

    if progress_callback:
        progress_callback(10, f"Loaded {total_pages} pages, chunking...")

    batch_size = 40
    batches = [all_pages[i:i + batch_size] for i in range(0, total_pages, batch_size)]
    total_batches = max(len(batches), 1)

    embedder = create_embeddings()

    completed = 0
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(_embed_and_store, batch, embedder): i for i, batch in enumerate(batches)}
        for future in as_completed(futures):
            future.result()
            completed += 1
            if progress_callback:
                pct = 10 + int(completed / total_batches * 88)
                progress_callback(pct, f"Indexed {completed}/{total_batches} batches...")

    if progress_callback:
        progress_callback(100, "Done")

    return {"pages": total_pages, "batches": total_batches}
