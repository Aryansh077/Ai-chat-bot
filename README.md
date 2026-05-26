# Simple AI Chatbot and Code Generator

This project is a beginner-friendly example of an AI chatbot and code generator built with Python, FastAPI, and a simple HTML/CSS/JavaScript frontend.

The goal is to keep the code easy to read, easy to change, and easy to deploy.

## Folder Structure

```text
project/
├── backend/
│   └── app/
│       ├── __init__.py
│       ├── ai_service.py
│       ├── database.py
│       └── main.py
├── frontend/
│   ├── app.js
│   ├── config.js
│   ├── index.html
│   └── styles.css
├── requirements.txt
├── README.md
├── .env
└── .env.example
```

### File purpose

- `backend/app/main.py` - FastAPI routes for chat, code generation, and history.
- `backend/app/ai_service.py` - OpenAI API calls and prompt helpers.
- `backend/app/database.py` - SQLite helper functions for saving and loading chat history.
- `frontend/index.html` - Main page structure for the UI.
- `frontend/styles.css` - All styling for the dark theme and responsive layout.
- `frontend/config.js` - Frontend settings like the backend URL.
- `frontend/app.js` - Frontend logic for sending prompts, showing messages, and managing history.
- `requirements.txt` - Python dependencies for the backend.
- `.env` - Local environment variables, including your OpenAI key.
- `.env.example` - Template file that shows which environment variables are needed.

## Features

- Chat interface
- Code generation
- SQLite chat history
- Copy code button
- Download code button
- Dark mode UI
- Responsive layout
- Loading animation

## Backend Code

The backend has three main routes:

- `POST /chat` - sends a chat prompt to OpenAI and returns a normal reply
- `POST /generate-code` - sends a coding prompt to OpenAI and returns code only
- `GET /history` - returns all saved chat sessions
- `GET /history/{session_id}` - returns one session's messages

The backend uses:

- FastAPI for the web server
- the latest OpenAI Python SDK
- SQLite for simple history storage
- environment variables for secret keys

## Frontend Code

The frontend is plain HTML, CSS, and JavaScript. It includes:

- a sidebar for saved chats
- Chat and Code mode buttons
- chat bubbles like ChatGPT
- a loading animation while waiting for AI
- markdown rendering and code highlighting
- copy and download buttons for generated code

## Setup Guide

### 1. Install Python packages

```bash
pip install -r requirements.txt
```

### 2. Add your OpenAI API key

Open `.env` and replace the placeholder value:

```env
OPENAI_API_KEY=your_actual_key_here
OPENAI_MODEL=gpt-4o-mini
```

### 3. Start the backend

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Open the frontend

Use any simple local server for the `frontend` folder. One easy option is:

```bash
cd frontend
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Deployment Guide

### Backend on Render

1. Push the project to GitHub.
2. Create a new Render Web Service.
3. Set the build command to:

```bash
pip install -r requirements.txt
```

4. Set the start command to:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

5. Add `OPENAI_API_KEY` and `OPENAI_MODEL` in the Render environment settings.

### Frontend on Vercel or Netlify

1. Deploy the `frontend` folder as a static site.
2. Update `frontend/config.js` so `API_BASE_URL` points to your Render backend URL.
3. Redeploy the frontend after changing the backend URL.

## Local Run Commands

- Start backend: `uvicorn backend.app.main:app --reload`
- Start frontend: `cd frontend && python -m http.server 5500`

## Future Improvements

- Add user login
- Save more metadata for each chat
- Add streaming responses
- Add multiple AI model choices
- Add better markdown sanitizing
- Add message search
- Add message delete buttons

## Notes

This project is intentionally simple. It is designed to teach the basic flow of:

1. user enters a prompt
2. frontend sends the prompt to FastAPI
3. FastAPI calls OpenAI
4. response is saved to SQLite
5. frontend shows the answer in a clean chat UI
