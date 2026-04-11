import os
from groq import Groq
from langchain_core.documents import Document


def get_answer(context_chunks, user_query, chat_history=""):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    context_text = "\n\n".join(
        chunk.page_content if isinstance(chunk, Document) else str(chunk)
        for chunk in context_chunks
    )

    system_prompt = (
        "You are a helpful assistant. Use the provided context to answer the user's question. "
        "If the answer is not in the context, say that you don't know."
    )

    user_content = f"""Conversation history:
{chat_history}

Context:
{context_text}

Question:
{user_query}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
    )

    return response.choices[0].message.content
