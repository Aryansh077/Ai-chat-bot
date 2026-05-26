"""FastAPI app for the beginner-friendly AI chatbot and code generator."""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .ai_service import generate_chat_reply, generate_code_reply
from .database import create_session, get_messages, get_sessions, init_db, save_message


app = FastAPI(title="Simple AI Chatbot and Code Generator")

# Keep CORS simple so the frontend can call the backend during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    """Incoming data for the chat endpoint."""

    message: str = Field(..., min_length=1, description="User message")
    session_id: Optional[str] = Field(default=None, description="Chat session id")


class CodeRequest(BaseModel):
    """Incoming data for the code generation endpoint."""

    prompt: str = Field(..., min_length=1, description="Code prompt")
    language: str = Field(default="python", description="Target language")
    session_id: Optional[str] = Field(default=None, description="Chat session id")


@app.on_event("startup")
async def startup_event() -> None:
    """Create the SQLite tables when the app starts."""
    init_db()


@app.get("/")
async def root() -> dict:
    """Simple health check route."""
    return {"message": "AI chatbot backend is running."}


@app.post("/chat")
async def chat(request: ChatRequest) -> dict:
    """Send a prompt to OpenAI and return a normal AI reply."""
    session_id = create_session(request.session_id)
    save_message(session_id, "user", request.message, "chat")

    try:
        response_text = await generate_chat_reply(request.message)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    save_message(session_id, "assistant", response_text, "chat")
    return {"session_id": session_id, "response": response_text}


@app.post("/generate-code")
async def generate_code(request: CodeRequest) -> dict:
    """Send a prompt to OpenAI and return code only."""
    session_id = create_session(request.session_id)
    save_message(session_id, "user", request.prompt, "code")

    try:
        code_text = await generate_code_reply(request.prompt, request.language)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    save_message(session_id, "assistant", code_text, "code")
    return {
        "session_id": session_id,
        "language": request.language,
        "code": code_text,
    }


@app.get("/history")
async def history() -> dict:
    """Return all saved chats so the sidebar can list them."""
    return {"sessions": get_sessions()}


@app.get("/history/{session_id}")
async def history_detail(session_id: str) -> dict:
    """Return all messages for one chat session."""
    messages = get_messages(session_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "messages": messages}
