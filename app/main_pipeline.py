from app.retrival.retrieve_query import retrive
from app.generator.llm import get_answer
def run_main_pipeline(query):
    chunks = retrive(query)
    result = get_answer(chunks, query)
    
    return results