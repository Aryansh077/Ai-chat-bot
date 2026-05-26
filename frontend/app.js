/*
  Beginner-friendly frontend logic.
  The code is split into small helpers so each part is easy to follow.
*/

const state = {
  apiBaseUrl: window.APP_CONFIG?.API_BASE_URL || "http://localhost:8000",
  sessionId: localStorage.getItem("ai-chat-session-id") || "",
  mode: "chat",
  sessions: [],
  isLoading: false,
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  // Cache the page elements once so the rest of the file can stay simple.
  elements.newChatButton = document.getElementById("newChatButton");
  elements.chatModeButton = document.getElementById("chatModeButton");
  elements.codeModeButton = document.getElementById("codeModeButton");
  elements.sidebarList = document.getElementById("sidebarList");
  elements.messages = document.getElementById("messages");
  elements.form = document.getElementById("composerForm");
  elements.input = document.getElementById("promptInput");
  elements.sessionTitle = document.getElementById("sessionTitle");
  elements.sessionSubtitle = document.getElementById("sessionSubtitle");
  elements.statusText = document.getElementById("statusText");

  setupMarkdownRenderer();
  bindEvents();
  loadSidebar();
  loadCurrentSession();
  showWelcomeMessage();
});

function setupMarkdownRenderer() {
  // Marked keeps the message rendering code very small.
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight(code, language) {
        if (window.hljs && language && hljs.getLanguage(language)) {
          return hljs.highlight(code, { language }).value;
        }
        return code;
      },
    });
  }
}

function bindEvents() {
  elements.newChatButton.addEventListener("click", startNewChat);
  elements.chatModeButton.addEventListener("click", () => setMode("chat"));
  elements.codeModeButton.addEventListener("click", () => setMode("code"));
  elements.form.addEventListener("submit", handleSubmit);

  elements.input.addEventListener("keydown", (event) => {
    // Enter sends the prompt. Shift+Enter adds a new line.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      elements.form.requestSubmit();
    }
  });
}

function setMode(mode) {
  state.mode = mode;
  elements.chatModeButton.classList.toggle("active", mode === "chat");
  elements.codeModeButton.classList.toggle("active", mode === "code");
  elements.sessionSubtitle.textContent = mode === "chat" ? "Ready to chat" : "Ready to generate code";
  elements.statusText.textContent = mode === "chat" ? "Chat mode" : "Code mode";
}

function startNewChat() {
  state.sessionId = "";
  localStorage.removeItem("ai-chat-session-id");
  elements.sessionTitle.textContent = "AI Chat Assistant";
  elements.sessionSubtitle.textContent = state.mode === "chat" ? "Ready to chat" : "Ready to generate code";
  elements.messages.innerHTML = "";
  showWelcomeMessage();
  highlightActiveSession();
}

async function loadSidebar() {
  try {
    const response = await fetch(`${state.apiBaseUrl}/history`);
    const data = await response.json();
    state.sessions = data.sessions || [];
    renderSidebar();
  } catch (error) {
    console.error("Could not load history:", error);
    elements.sidebarList.innerHTML = '<p class="hint">History is not available yet.</p>';
  }
}

function renderSidebar() {
  if (!state.sessions.length) {
    elements.sidebarList.innerHTML = '<p class="hint">No saved chats yet.</p>';
    return;
  }

  elements.sidebarList.innerHTML = "";
  state.sessions.forEach((session) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "session-item";
    button.dataset.sessionId = session.id;
    button.innerHTML = `
      <strong>${escapeHtml(session.title || "New chat")}</strong>
      <span>${session.message_count || 0} messages</span>
    `;

    button.addEventListener("click", () => loadSession(session.id));
    elements.sidebarList.appendChild(button);
  });

  highlightActiveSession();
}

async function loadCurrentSession() {
  if (!state.sessionId) {
    return;
  }

  await loadSession(state.sessionId, true);
}

async function loadSession(sessionId, silent = false) {
  try {
    const response = await fetch(`${state.apiBaseUrl}/history/${sessionId}`);
    if (!response.ok) {
      throw new Error("Session not found");
    }

    const data = await response.json();
    state.sessionId = data.session_id;
    localStorage.setItem("ai-chat-session-id", state.sessionId);

    elements.messages.innerHTML = "";
    data.messages.forEach((message) => {
      if (message.message_type === "code" && message.role === "assistant") {
        addCodeCard(message.content, message.message_type || "code");
      } else {
        addMessageBubble(message.role, message.content);
      }
    });

    const chosenSession = state.sessions.find((session) => session.id === sessionId);
    if (chosenSession) {
      elements.sessionTitle.textContent = chosenSession.title || "AI Chat Assistant";
    }

    elements.sessionSubtitle.textContent = state.mode === "chat" ? "Loaded chat history" : "Loaded code history";
    highlightActiveSession();
    scrollMessagesToBottom();
  } catch (error) {
    console.error(error);
    if (!silent) {
      showWelcomeMessage();
    }
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const userText = elements.input.value.trim();
  if (!userText || state.isLoading) {
    return;
  }

  elements.input.value = "";
  addMessageBubble("user", userText);
  const loadingBubble = addLoadingBubble();
  setLoadingState(true);

  try {
    const endpoint = state.mode === "code" ? "/generate-code" : "/chat";
    const payload =
      state.mode === "code"
        ? {
            prompt: userText,
            language: "python",
            session_id: state.sessionId || null,
          }
        : {
            message: userText,
            session_id: state.sessionId || null,
          };

    const response = await fetch(`${state.apiBaseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Something went wrong");
    }

    state.sessionId = data.session_id;
    localStorage.setItem("ai-chat-session-id", state.sessionId);

    if (state.mode === "code") {
      addCodeCard(data.code || "", data.language || "python");
    } else {
      addMessageBubble("assistant", data.response || "No response was returned.");
    }

    await loadSidebar();
    elements.sessionTitle.textContent = state.mode === "chat" ? "AI Chat Assistant" : "AI Code Generator";
    elements.sessionSubtitle.textContent = state.mode === "chat" ? "Latest AI reply" : "Generated code ready";
  } catch (error) {
    addMessageBubble("assistant", `Error: ${error.message}`);
    console.error("Request failed:", error);
  } finally {
    loadingBubble.remove();
    setLoadingState(false);
    scrollMessagesToBottom();
  }
}

function setLoadingState(isLoading) {
  state.isLoading = isLoading;
  elements.statusText.textContent = isLoading ? "Thinking..." : state.mode === "chat" ? "Chat mode" : "Code mode";
  elements.form.querySelector("button[type='submit']").disabled = isLoading;
}

function addMessageBubble(role, content) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${role}`;
  bubble.innerHTML = window.marked ? marked.parse(content) : escapeHtml(content).replace(/\n/g, "<br />");

  row.appendChild(bubble);
  elements.messages.appendChild(row);

  if (window.hljs) {
    bubble.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
  }

  scrollMessagesToBottom();
  return row;
}

function addCodeCard(codeText, language) {
  const row = document.createElement("div");
  row.className = "message-row assistant";

  const card = document.createElement("div");
  card.className = "code-card";

  card.innerHTML = `
    <div class="code-card-header">
      <span class="code-card-title">Generated ${escapeHtml(language)} code</span>
      <div class="code-actions">
        <button type="button" class="code-action" data-copy>Copy</button>
        <button type="button" class="code-action" data-download>Download</button>
      </div>
    </div>
    <pre><code class="language-${escapeHtml(language)}"></code></pre>
  `;

  const codeElement = card.querySelector("code");
  codeElement.textContent = codeText;

  if (window.hljs) {
    hljs.highlightElement(codeElement);
  }

  card.querySelector("[data-copy]").addEventListener("click", () => copyCode(codeText));
  card.querySelector("[data-download]").addEventListener("click", () => downloadCode(codeText, language));

  row.appendChild(card);
  elements.messages.appendChild(row);
  scrollMessagesToBottom();
  return row;
}

function addLoadingBubble() {
  const row = document.createElement("div");
  row.className = "message-row assistant";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble assistant";
  bubble.innerHTML = `
    <div class="loading-dots" aria-label="Loading">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  row.appendChild(bubble);
  elements.messages.appendChild(row);
  scrollMessagesToBottom();
  return row;
}

function showWelcomeMessage() {
  if (elements.messages.children.length > 0) {
    return;
  }

  const welcome = document.createElement("div");
  welcome.className = "message-row assistant";
  welcome.innerHTML = `
    <div class="message-bubble assistant">
      <p><strong>Welcome!</strong></p>
      <p>Use <strong>Chat</strong> to ask questions or switch to <strong>Code</strong> to generate simple Python code.</p>
      <p>Your conversations are saved in SQLite history.</p>
    </div>
  `;
  elements.messages.appendChild(welcome);
}

function highlightActiveSession() {
  document.querySelectorAll(".session-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.sessionId === state.sessionId);
  });
}

function copyCode(codeText) {
  navigator.clipboard.writeText(codeText);
}

function downloadCode(codeText, language) {
  const extensionMap = {
    python: "py",
    javascript: "js",
    typescript: "ts",
    html: "html",
    css: "css",
    json: "json",
  };

  const extension = extensionMap[language.toLowerCase()] || "txt";
  const blob = new Blob([codeText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `generated-code.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

function scrollMessagesToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
