from rank_bm25 import BM25Okapi
import re

def build_bm25_index(chunks):
    # 1. Extract plain text from your chunks
    # (Assuming 'chunks' is a list of LangChain Document objects)
    corpus = [chunk.page_content for chunk in chunks]
    
    # 2. Tokenize the corpus
    # We convert to lowercase and split into words
    tokenized_corpus = [doc.lower().split(" ") for doc in corpus]
    
    # 3. Initialize BM25
    bm25 = BM25Okapi(tokenized_corpus)
    
    return bm25, chunks

def bm25_search(bm25, chunks, query, k=3):
    # 1. Tokenize the query the same way as the corpus
    tokenized_query = query.lower().split(" ")
    
    # 2. Get scores and retrieve the top 'k' chunks
    # This returns the actual Document objects based on their BM25 score
    top_docs = bm25.get_top_n(tokenized_query, chunks, n=k)
    
    return top_docs