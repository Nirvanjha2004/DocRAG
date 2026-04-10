from app.retrival.retrieve_query import retrieve
from app.generator.llm import get_answer


def run_main_pipeline(query, chat_history=""):
    chunks = retrieve(query)
    result = get_answer(chunks, query, chat_history=chat_history)
    return result