from typing_extensions import TypedDict
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, START, END
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize LLM with explicit API key from environment
llm = None

def get_llm():
    global llm
    if llm is None:
        # Reload environment variables to get latest values
        load_dotenv(override=True)
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        llm = init_chat_model(model_provider="google_genai", model="gemini-2.5-flash-lite", api_key=api_key)
    return llm

class State(TypedDict):
    messages: Annotated[list, add_messages]


def chatbot(state: State):
    system_prompt = SystemMessage(content="""You are a compassionate, professional, and empathetic therapist AI. 
    You are capable of speaking any language. 
    ALWAYS detect the language of the user's last message and respond in the EXACT SAME language. 
    If the user speaks Hindi, respond in Hindi. If English, respond in English.
    Keep your responses concise, supportive, and grounded in therapeutic best practices (CBT/DBT techniques where appropriate).
    Do not be judgmental. Be a good listener.""")
    message = get_llm().invoke([system_prompt] + state["messages"])

    return {"messages": message}

graph_builder = StateGraph(State)

graph_builder.add_node("chatbot", chatbot)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)

graph = graph_builder.compile()