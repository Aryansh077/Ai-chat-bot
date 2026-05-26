"""OpenAI helper functions.

This file keeps the API calls separate so main.py stays easy to read.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from openai import AsyncOpenAI


# Load environment variables from .env before we read the API key.
load_dotenv()


def _get_client() -> AsyncOpenAI:
    """Create the OpenAI client only when the key is present."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to your .env file.")
    return AsyncOpenAI(api_key=api_key)


def _clean_code(text: str) -> str:
    """Remove markdown fences if the model returns them anyway."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned


async def generate_chat_reply(message: str) -> str:
    """Ask the AI for a normal chat response."""
    client = _get_client()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    response = await client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": (
                    "You are a friendly AI assistant. Keep answers simple, clear, "
                    "and beginner-friendly."
                ),
            },
            {"role": "user", "content": message},
        ],
    )

    return (response.output_text or "").strip() or "Sorry, I could not generate a reply."


async def generate_code_reply(prompt: str, language: str = "python") -> str:
    """Ask the AI to return only code for the requested task."""
    client = _get_client()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    response = await client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": (
                    f"You are a coding assistant. Write only {language} code. "
                    "Do not add explanations, markdown, or code fences. "
                    "Keep the code simple and easy to understand."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )

    return _clean_code(response.output_text or "")
