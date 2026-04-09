import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain

def get_answer(context_chunks, user_query):
    # 1. Initialize LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3
    )

    # 2. Define Template (Keep {context} and {input} placeholders)
    template = """
    You are a helpful assistant. Use the following context to answer the user's question.
    If the answer is not in the context, just say that you don't know. 

    Context:
    {context}

    Question: 
    {input}

    Answer:
    """
    prompt = PromptTemplate.from_template(template)

    # 3. Create the Chain
    combine_docs_chain = create_stuff_documents_chain(llm, prompt)

    # 4. Invoke correctly
    # context_chunks MUST be a list of Document objects retrieved from your DB
    response = combine_docs_chain.invoke({
        "context": context_chunks, 
        "input": user_query
    })
    
    return response # This returns the string answer