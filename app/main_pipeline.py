from app.retrival.retrieve_query import retrieve
from app.generator.llm import get_answer


def run_main_pipeline(query):
    chunks = retrieve(query)
    result = get_answer(chunks, query)
    return result