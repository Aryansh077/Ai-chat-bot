"""Tiny SQLite helper functions for chat history.

The goal here is to keep the database code easy to read.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import uuid
from typing import Any, Dict, List


# Store the SQLite database inside backend/data so it stays out of the frontend.
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "chatbot.db"


def _utc_now() -> str:
    """Return a simple UTC timestamp string."""
    return datetime.now(timezone.utc).isoformat()


def _new_connection() -> sqlite3.Connection:
    """Open a connection and return rows as dictionary-like objects."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _make_title(text: str) -> str:
    """Create a short chat title from the first user message."""
    words = text.strip().split()
    if not words:
        return "New chat"
    title = " ".join(words[:6])
    return title[:40]


def init_db() -> None:
    """Create the tables if they do not exist yet."""
    with _new_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions (id)
            )
            """
        )
        connection.commit()


def create_session(session_id: str | None = None) -> str:
    """Create a new session or make sure an existing one is present."""
    real_session_id = session_id or str(uuid.uuid4())
    now = _utc_now()

    with _new_connection() as connection:
        connection.execute(
            """
            INSERT OR IGNORE INTO sessions (id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (real_session_id, "New chat", now, now),
        )
        connection.commit()

    return real_session_id


def save_message(session_id: str, role: str, content: str, message_type: str) -> None:
    """Save one message and update the session title and timestamp."""
    create_session(session_id)
    now = _utc_now()

    with _new_connection() as connection:
        connection.execute(
            """
            INSERT INTO messages (session_id, role, content, message_type, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (session_id, role, content, message_type, now),
        )

        # Give the chat a useful title after the first user message.
        if role == "user":
            session_row = connection.execute(
                "SELECT title FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
            if session_row and session_row["title"] == "New chat":
                connection.execute(
                    "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
                    (_make_title(content), now, session_id),
                )
            else:
                connection.execute(
                    "UPDATE sessions SET updated_at = ? WHERE id = ?",
                    (now, session_id),
                )
        else:
            connection.execute(
                "UPDATE sessions SET updated_at = ? WHERE id = ?",
                (now, session_id),
            )

        connection.commit()


def get_sessions() -> List[Dict[str, Any]]:
    """Return all sessions so the frontend can show them in the sidebar."""
    with _new_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                s.id,
                s.title,
                s.created_at,
                s.updated_at,
                COUNT(m.id) AS message_count
            FROM sessions s
            LEFT JOIN messages m ON m.session_id = s.id
            GROUP BY s.id, s.title, s.created_at, s.updated_at
            ORDER BY s.updated_at DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def get_messages(session_id: str) -> List[Dict[str, Any]]:
    """Return all messages for one chat session."""
    with _new_connection() as connection:
        rows = connection.execute(
            """
            SELECT role, content, message_type, created_at
            FROM messages
            WHERE session_id = ?
            ORDER BY id ASC
            """,
            (session_id,),
        ).fetchall()

    return [dict(row) for row in rows]
