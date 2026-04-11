import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document


def get_answer(context_chunks, user_query, chat_history=""):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3
    )

    context_text = "\n\n".join(
        chunk.page_content if isinstance(chunk, Document) else str(chunk)
        for chunk in context_chunks
    )

    template = """You are a helpful assistant. Use the following context to answer the user's question.
If the answer is not in the context, just say that you don't know.

Conversation history:
{chat_history}

Context:
{context}

Question: 
{input}

Answer:"""

    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm

    response = chain.invoke({
        "context": context_text,
        "input": user_query,
        "chat_history": chat_history,
    })

    if hasattr(response, "content"):
        return response.content
    return str(response)
