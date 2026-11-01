/* ============================================================
   Gemini Chat · conexión con Google AI Studio
   API: https://ai.google.dev/gemini-api/docs
   ============================================================ */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const LS_SETTINGS = "geminichat.settings";
const LS_HISTORY = "geminichat.history";
const LS_MODELS = "geminichat.models";

const DEFAULT_MODELS = [
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash-lite",
  "gemini-pro-latest",
];

// Se prueban en orden si el modelo elegido devuelve 503 (alta demanda) o 404
// (modelo retirado). Solo modelos de texto de la familia Flash.
const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
];

const state = {
  apiKey: "",
  model: DEFAULT_MODELS[0],
  temperature: 0.7,
  history: [],
  models: [...DEFAULT_MODELS],
  busy: false,
  controller: null,
  failedText: null,
};

const els = {
  chat: document.getElementById("chat"),
  messages: document.getElementById("messages"),
  emptyState: document.getElementById("emptyState"),
  emptyKeyHint: document.getElementById("emptyKeyHint"),
  keyBanner: document.getElementById("keyBanner"),

  modelSelect: document.getElementById("modelSelect"),
  modelHint: document.getElementById("modelHint"),

  composer: document.getElementById("composer"),
  input: document.getElementById("input"),
  sendBtn: document.getElementById("sendBtn"),
  stopBtn: document.getElementById("stopBtn"),

  newChatBtn: document.getElementById("newChatBtn"),
  settingsBtn: document.getElementById("settingsBtn"),

  dialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  tempInput: document.getElementById("tempInput"),
  tempValue: document.getElementById("tempValue"),
  detectModelsBtn: document.getElementById("detectModelsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  settingsStatus: document.getElementById("settingsStatus"),
};

/* ============================================================
   Almacenamiento local
   ============================================================ */

function load() {
  try {
    const settings = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
    if (typeof settings.apiKey === "string") state.apiKey = settings.apiKey.trim();
    if (typeof settings.model === "string" && settings.model) state.model = settings.model;
    if (Number.isFinite(settings.temperature)) state.temperature = settings.temperature;

    const models = JSON.parse(localStorage.getItem(LS_MODELS) || "null");
    if (Array.isArray(models) && models.length) state.models = models;

    const history = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
    if (Array.isArray(history)) {
      state.history = history.filter(
        (m) => m && (m.role === "user" || m.role === "model") && typeof m.text === "string"
      );
    }
  } catch (error) {
    console.warn("No se pudo leer el almacenamiento local:", error);
  }
}

function persistSettings() {
  localStorage.setItem(
    LS_SETTINGS,
    JSON.stringify({
      apiKey: state.apiKey,
      model: state.model,
      temperature: state.temperature,
    })
  );
}

function persistHistory() {
  try {
    // Se guardan solo los últimos 40 mensajes para no crecer sin control.
    const trimmed = state.history.slice(-40);
    localStorage.setItem(LS_HISTORY, JSON.stringify(trimmed));
  } catch {
    /* almacenamiento lleno o bloqueado: la app sigue funcionando */
  }
}

function persistModels() {
  localStorage.setItem(LS_MODELS, JSON.stringify(state.models));
}

/* ============================================================
   Interfaz
   ============================================================ */

function renderModelOptions() {
  const models = state.models.includes(state.model)
    ? state.models
    : [state.model, ...state.models];

  els.modelSelect.innerHTML = "";
  for (const name of models) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = name === state.model;
    els.modelSelect.append(option);
  }
  els.modelHint.textContent = state.model;
}

function updateKeyState() {
  const hasKey = Boolean(state.apiKey);
  els.keyBanner.hidden = hasKey;
  els.emptyKeyHint.textContent = hasKey
    ? "API key configurada · listo para chatear."
    : "Aún no hay una API key configurada.";
  els.emptyKeyHint.classList.toggle("is-ok", hasKey);
}

function setBusy(busy) {
  state.busy = busy;
  els.sendBtn.hidden = busy;
  els.stopBtn.hidden = !busy;
  els.input.disabled = false;
}

function autoGrow() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(els.input.scrollHeight, 200)}px`;
}

function isNearBottom() {
  const el = els.chat;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
}

function scrollToBottom(force = false) {
  if (force || isNearBottom()) {
    els.chat.scrollTop = els.chat.scrollHeight;
  }
}

/* ============================================================
   Markdown mínimo y seguro
   ============================================================ */

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function renderInline(text) {
  const codes = [];
  let html = escapeHtml(text);

  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  html = html.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
  );

  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => {
    return `<code>${codes[Number(index)]}</code>`;
  });
}

function renderTextBlock(block) {
  const lines = block.split("\n").filter((line) => line.trim() !== "");

  if (lines.length && lines.every((line) => /^[-*]\s+/.test(line))) {
    return `<ul>${lines.map((line) => `<li>${renderInline(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
  }

  if (lines.length && lines.every((line) => /^\d+[.)]\s+/.test(line))) {
    return `<ol>${lines.map((line) => `<li>${renderInline(line.replace(/^\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
  }

  if (/^###\s+/.test(block)) return `<h3>${renderInline(block.replace(/^###\s+/, ""))}</h3>`;
  if (/^##\s+/.test(block)) return `<h3>${renderInline(block.replace(/^##\s+/, ""))}</h3>`;
  if (/^#\s+/.test(block)) return `<h3>${renderInline(block.replace(/^#\s+/, ""))}</h3>`;

  return `<p>${renderInline(block.trim()).replace(/\n/g, "<br>")}</p>`;
}

function renderMarkdown(text) {
  if (!text) return "";

  const parts = text.split("```");
  let html = "";

  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const newline = part.indexOf("\n");
      const code = newline >= 0 ? part.slice(newline + 1) : part;
      html += `<pre><code>${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`;
    } else {
      html += part
        .split(/\n{2,}/)
        .map((block) => (block.trim() ? renderTextBlock(block) : ""))
        .join("");
    }
  });

  return html;
}

/* ============================================================
   Mensajes
   ============================================================ */

function createCopyButton(text) {
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "msg__copy";
  copy.textContent = "Copiar";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = "Copiado ✓";
    } catch {
      copy.textContent = "No se pudo copiar";
    }
    setTimeout(() => {
      copy.textContent = "Copiar";
    }, 1600);
  });
  return copy;
}

function buildMessageElement(message, options = {}) {
  const { streaming = false, error = false } = options;

  const article = document.createElement("article");
  article.className = `msg msg--${message.role}`;
  if (error) article.classList.add("msg--error");

  const meta = document.createElement("div");
  meta.className = "msg__meta";

  if (message.role === "model") {
    const avatar = document.createElement("span");
    avatar.className = "msg__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.innerHTML =
      '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" fill="currentColor"/></svg>';
    meta.append(avatar);
  }

  const name = document.createElement("span");
  name.className = "msg__name";
  name.textContent = message.role === "model" ? "Gemini" : "Tú";
  meta.append(name);

  if (message.role === "model" && !streaming && !error) {
    meta.append(createCopyButton(message.text));
  }

  const bubble = document.createElement("div");
  bubble.className = "msg__bubble";

  const body = document.createElement("div");
  body.className = "msg__body";

  if (streaming) {
    body.innerHTML =
      '<span class="typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>';
  } else if (error) {
    body.textContent = message.text;
  } else {
    body.innerHTML = renderMarkdown(message.text);
  }

  bubble.append(body);
  article.append(meta, bubble);

  return { article, body, meta, bubble };
}

function appendMessage(message, options) {
  const elements = buildMessageElement(message, options);
  els.messages.append(elements.article);
  els.emptyState.hidden = true;
  return elements;
}

function showError(text) {
  const elements = buildMessageElement(
    { role: "model", text },
    { error: true }
  );

  if (state.failedText) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-btn";
    retry.textContent = "Reintentar";
    retry.addEventListener("click", () => {
      elements.article.remove();
      const text = state.failedText;
      state.failedText = null;
      state.history.push({ role: "user", text });
      persistHistory();
      generateReply();
    });
    elements.bubble.append(retry);
  }

  els.messages.append(elements.article);
  els.emptyState.hidden = true;
  scrollToBottom(true);
}

function clearConversation() {
  if (state.busy) state.controller?.abort();
  state.history = [];
  state.failedText = null;
  els.messages.innerHTML = "";
  els.emptyState.hidden = false;
  persistHistory();
  updateKeyState();
  els.input.focus();
}

/* ============================================================
   API de Gemini
   ============================================================ */

function readErrorBody(response, rawText) {
  let detail = "";
  try {
    const data = JSON.parse(rawText);
    detail = data?.error?.message || "";
  } catch {
    detail = rawText.slice(0, 300);
  }

  const labels = {
    400: "Solicitud inválida",
    401: "API key inválida",
    403: "Acceso denegado (revisa la clave y que la API esté habilitada)",
    404: "Modelo no encontrado",
    429: "Límite de cuota alcanzado, intenta en unos segundos",
    500: "Error interno de Google",
    503: "Servicio no disponible en este momento",
  };

  const label = labels[response.status] || "Error de la API";
  if (response.status === 400 && /api[ _-]?key/i.test(detail)) {
    return `API key inválida: ${detail}`;
  }
  return `${label} (${response.status})${detail ? `: ${detail}` : "."}`;
}

async function streamReply(onChunk, model = state.model) {
  const url =
    `${API_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent` +
    `?alt=sse&key=${encodeURIComponent(state.apiKey)}`;

  // Se envía una ventana de contexto reciente y se garantiza que empiece
  // por un turno de usuario (requisito de la API).
  const contents = state.history.slice(-40);
  while (contents.length && contents[0].role !== "user") contents.shift();

  const body = {
    contents: contents.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    })),
    generationConfig: {
      temperature: state.temperature,
      maxOutputTokens: 4096,
    },
  };

  const controller = new AbortController();
  state.controller = controller;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "No se pudo conectar con Google AI Studio. Revisa tu conexión a internet."
    );
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    const error = new Error(readErrorBody(response, raw));
    error.status = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }

      if (payload.promptFeedback?.blockReason) {
        throw new Error(
          `La solicitud fue bloqueada por los filtros de seguridad (${payload.promptFeedback.blockReason}).`
        );
      }

      const candidate = payload.candidates?.[0];
      const text = (candidate?.content?.parts || [])
        .map((part) => part.text || "")
        .join("");

      if (text) onChunk(text);

      if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        const reason = candidate.finishReason;
        if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT") {
          throw new Error("La respuesta fue bloqueada por los filtros de seguridad de Google.");
        }
        if (reason === "MAX_TOKENS" && !text) {
          throw new Error("Se alcanzó el límite de tokens antes de generar una respuesta.");
        }
      }
    }
  }
}

/* ============================================================
   Flujo de conversación
   ============================================================ */

function scheduleRender(body, getText) {
  let pending = false;
  return () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      body.innerHTML = renderMarkdown(getText());
      scrollToBottom();
    });
  };
}

function fallbackModels(currentModel) {
  return FALLBACK_MODELS.filter(
    (name) =>
      name !== currentModel &&
      (state.models.length === 0 || state.models.includes(name))
  ).slice(0, 2);
}

async function generateReply() {
  if (state.busy) return;

  setBusy(true);
  const elements = appendMessage({ role: "model", text: "" }, { streaming: true });
  scrollToBottom(true);

  let full = "";
  const update = scheduleRender(elements.body, () => full);
  let firstChunk = true;

  const onChunk = (chunk) => {
    if (firstChunk) {
      firstChunk = false;
      elements.body.innerHTML = "";
    }
    full += chunk;
    update();
  };

  const originalModel = state.model;
  const candidates = [originalModel, ...fallbackModels(originalModel)];

  let usedModel = originalModel;
  let succeeded = false;
  let aborted = false;
  let lastError = null;

  for (const model of candidates) {
    usedModel = model;
    full = "";
    firstChunk = true;
    elements.body.innerHTML =
      '<span class="typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>';

    try {
      await streamReply(onChunk, model);
      if (!full.trim()) {
        throw new Error("Gemini no devolvió texto. Prueba reformulando tu mensaje.");
      }
      succeeded = true;
      break;
    } catch (error) {
      lastError = error;

      if (error.name === "AbortError") {
        aborted = true;
        break;
      }

      // 503 = modelo saturado, 404 = modelo retirado: se prueba el siguiente.
      const retriable = error.status === 503 || error.status === 404;
      if (!retriable || model === candidates[candidates.length - 1]) break;
    }
  }

  if (succeeded) {
    state.history.push({ role: "model", text: full });
    persistHistory();
    state.failedText = null;
    elements.body.innerHTML = renderMarkdown(full);

    if (usedModel !== originalModel) {
      state.model = usedModel;
      persistSettings();
      renderModelOptions();
      const note = document.createElement("p");
      note.className = "msg__switched";
      note.textContent = `Modelo cambiado a ${usedModel} por disponibilidad.`;
      elements.bubble.append(note);
    }

    elements.meta.append(createCopyButton(full));
  } else if (aborted) {
    if (full.trim()) {
      state.history.push({ role: "model", text: full });
      persistHistory();
      state.failedText = null;
      elements.body.innerHTML = renderMarkdown(full);
      elements.bubble.insertAdjacentHTML(
        "beforeend",
        '<p class="hint">Generación detenida.</p>'
      );
    } else {
      elements.article.remove();
      const last = state.history[state.history.length - 1];
      if (last?.role === "user") {
        state.failedText = last.text;
        state.history.pop();
        persistHistory();
      }
      showError("Generación detenida antes de recibir respuesta.");
    }
  } else {
    elements.article.remove();

    // Quita del historial el último mensaje del usuario para que el próximo
    // envío vuelva a ser válido (la API exige turnos alternos).
    const last = state.history[state.history.length - 1];
    if (last?.role === "user") {
      state.failedText = last.text;
      state.history.pop();
      persistHistory();
    }

    showError(lastError?.message || "Ocurrió un error inesperado.");
  }

  state.controller = null;
  setBusy(false);
  els.input.focus();
}

async function sendMessage(text) {
  const clean = text.trim();
  if (!clean || state.busy) return;

  if (!state.apiKey) {
    openSettings("Configura tu API key para empezar.");
    return;
  }

  state.failedText = null;
  state.history.push({ role: "user", text: clean });
  persistHistory();
  appendMessage({ role: "user", text: clean });
  scrollToBottom(true);

  els.input.value = "";
  autoGrow();
  updateKeyState();

  await generateReply();
}

/* ============================================================
   Configuración
   ============================================================ */

function openSettings(message = "") {
  els.apiKeyInput.value = state.apiKey;
  els.tempInput.value = String(state.temperature);
  els.tempValue.textContent = state.temperature.toFixed(1);
  els.settingsStatus.textContent = message;
  els.settingsStatus.className = "status";
  els.dialog.showModal();
  setTimeout(() => els.apiKeyInput.focus(), 60);
}

async function detectModels() {
  const key = els.apiKeyInput.value.trim() || state.apiKey;
  if (!key) {
    setSettingsStatus("Primero escribe tu API key.", "error");
    return;
  }

  setSettingsStatus("Consultando modelos disponibles…", "muted");
  els.detectModelsBtn.disabled = true;

  try {
    const response = await fetch(
      `${API_BASE}/models?pageSize=200&key=${encodeURIComponent(key)}`
    );

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      throw new Error(readErrorBody(response, raw));
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((model) =>
        (model.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((model) => String(model.name || "").replace(/^models\//, ""))
      .filter((name) => name.includes("gemini"))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    if (!models.length) throw new Error("La clave no devolvió modelos compatibles.");

    state.models = models;
    if (!models.includes(state.model)) {
      state.model = models[0];
      persistSettings();
    }
    persistModels();
    renderModelOptions();
    setSettingsStatus(`${models.length} modelos encontrados.`, "ok");
  } catch (error) {
    setSettingsStatus(error.message || "No se pudieron cargar los modelos.", "error");
  } finally {
    els.detectModelsBtn.disabled = false;
  }
}

function setSettingsStatus(text, type = "muted") {
  els.settingsStatus.textContent = text;
  els.settingsStatus.className = "status";
  if (type === "error") els.settingsStatus.classList.add("is-error");
  if (type === "ok") els.settingsStatus.classList.add("is-ok");
}

function saveSettings(event) {
  event.preventDefault();

  const key = els.apiKeyInput.value.trim();
  if (key && !/^(AIza[\w-]+|AQ\.[\w-]+)$/.test(key)) {
    setSettingsStatus(
      "La clave no parece válida. Normalmente empieza por “AIza”. Puedes guardarla igualmente.",
      "error"
    );
  }

  state.apiKey = key;
  state.temperature = Number(els.tempInput.value);
  state.model = els.modelSelect.value || state.model;
  persistSettings();
  renderModelOptions();
  updateKeyState();
  els.dialog.close();
  els.input.focus();
}

/* ============================================================
   Eventos
   ============================================================ */

function bindEvents() {
  els.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(els.input.value);
  });

  els.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage(els.input.value);
    }
  });

  els.input.addEventListener("input", autoGrow);

  els.stopBtn.addEventListener("click", () => {
    state.controller?.abort();
  });

  els.modelSelect.addEventListener("change", () => {
    state.model = els.modelSelect.value;
    persistSettings();
    els.modelHint.textContent = state.model;
    els.input.focus();
  });

  els.newChatBtn.addEventListener("click", clearConversation);

  els.settingsBtn.addEventListener("click", () => openSettings());
  document.querySelectorAll("[data-open-settings]").forEach((button) => {
    button.addEventListener("click", () => openSettings());
  });

  els.closeSettingsBtn.addEventListener("click", () => els.dialog.close());

  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) els.dialog.close();
  });

  els.tempInput.addEventListener("input", () => {
    els.tempValue.textContent = Number(els.tempInput.value).toFixed(1);
  });

  els.detectModelsBtn.addEventListener("click", detectModels);

  els.settingsForm.addEventListener("submit", saveSettings);

  document.querySelectorAll("[data-prompt]").forEach((chip) => {
    chip.addEventListener("click", () => {
      els.input.value = chip.dataset.prompt || "";
      autoGrow();
      if (!state.apiKey) {
        openSettings("Configura tu API key para empezar.");
      } else {
        els.input.focus();
      }
    });
  });

  // Atajos: Cmd/Ctrl + K para nueva conversación.
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      clearConversation();
    }
  });
}

/* ============================================================
   Arranque
   ============================================================ */

function init() {
  load();
  renderModelOptions();
  bindEvents();
  updateKeyState();

  els.tempValue.textContent = state.temperature.toFixed(1);
  els.tempInput.value = String(state.temperature);

  for (const message of state.history) {
    appendMessage(message);
  }

  if (state.history.length) {
    els.emptyState.hidden = true;
    scrollToBottom(true);
  } else {
    els.emptyState.hidden = false;
  }

  autoGrow();
  els.input.focus();
}

init();
