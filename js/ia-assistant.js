(function () {
  const STORAGE_KEY = "protocord_ia_assistant_v1";
  const LAYOUT_STORAGE_KEY = "protocord_ia_assistant_layout_v1";
  const MIN_WIDGET_WIDTH = 360;
  const MAX_WIDGET_WIDTH = 760;
  const MIN_WIDGET_HEIGHT = 420;
  const MAX_WIDGET_HEIGHT = 860;

  function getApiBaseUrlSafe() {
    try {
      if (typeof window.getProtocordApiBaseUrl === "function") {
        return window.getProtocordApiBaseUrl();
      }
    } catch (_error) {}

    return "";
  }

  const state = {
    messages: [],
    sending: false,
    open: false,
    recording: false,
    transcribing: false,
    mediaRecorder: null,
    recordingChunks: [],
    recordingStartedAt: 0,
    recordingTimerId: null,
    panelWidth: null,
    panelHeight: null,
    resizing: false,
  };

  const els = {};

  function init() {
    removeLegacyAssistantUi();
    bindElements();
    if (!els.widget) return;
    applyPanelVisibility(false);
    restoreState();
    bindEvents();
    render();
  }

  function bindElements() {
    els.widget = document.getElementById("assistant-widget");
    els.panel = document.getElementById("assistant-panel");
    els.fab = document.getElementById("assistant-fab");
    els.closeBtn = document.getElementById("assistant-close-btn");
    els.messages = document.getElementById("assistant-messages");
    els.form = document.getElementById("assistant-form");
    els.input = document.getElementById("assistant-input");
    els.sendBtn = document.getElementById("assistant-send-btn");
    els.clearBtn = document.getElementById("assistant-clear-btn");
    els.audioBtn = document.getElementById("assistant-audio-btn");
    els.audioLabel = document.getElementById("assistant-audio-label");
    els.statusBadge = document.getElementById("assistant-status-badge");
    els.statusLabel = document.getElementById("assistant-status-label");
    els.recordingPill = document.getElementById("assistant-recording-pill");
    els.recordingTime = document.getElementById("assistant-recording-time");
    els.fabBadge = document.getElementById("assistant-fab-badge");
    els.resizeHandle = document.getElementById("assistant-resize-handle");
    els.suggestions = Array.from(document.querySelectorAll("[data-assistant-prompt]"));
  }

  function removeLegacyAssistantUi() {
    [
      "btn-assistente",
      "btn-assistente-mobile",
      "pagina-assistente",
      "pagina-assistente-legado",
      "embed-chat-ia",
      "embed-chat-metas",
      "embed-chat-ia-legado",
      "embed-chat-metas-legado",
    ].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });

    const legacyBlocks = Array.from(document.querySelectorAll("[id*='chat-container'], [class*='chat-container']"))
      .map((node) => node.closest("section, article, div"))
      .filter(Boolean);

    legacyBlocks.forEach((block) => {
      if (block instanceof HTMLElement && /cordia|assistente contextual|cordia rapido/i.test(block.textContent || "")) {
        block.remove();
      }
    });
  }

  function bindEvents() {
    els.form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitMessage();
    });

    els.resizeHandle?.addEventListener("pointerdown", startPanelResize);

    els.input?.addEventListener("input", () => {
      autoResizeInput();
    });

    els.input?.addEventListener("keydown", async (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await submitMessage();
      }
    });

    els.clearBtn?.addEventListener("click", () => {
      state.messages = [];
      persist();
      render();
      notify("Pesquisas limpas.", "success");
    });

    els.audioBtn?.addEventListener("click", async () => {
      if (state.transcribing) return;
      if (state.recording) {
        stopRecording();
        return;
      }
      await startRecording();
    });

    els.suggestions.forEach((button) => {
      button.addEventListener("click", async () => {
        if (!els.input) return;
        els.input.value = button.dataset.assistantPrompt || "";
        autoResizeInput();
        await submitMessage();
      });
    });

    window.addEventListener("resize", applyPanelLayout);
    autoResizeInput();
  }

  function restoreState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.messages = Array.isArray(parsed.messages) ? parsed.messages.slice(-20) : [];
    } catch (_error) {
      state.messages = [];
    }

    state.open = false;
    restoreLayoutState();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: state.messages.slice(-20),
    }));
  }

  function restoreLayoutState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || "{}");
      state.panelWidth = Number.isFinite(parsed.panelWidth) ? parsed.panelWidth : null;
      state.panelHeight = Number.isFinite(parsed.panelHeight) ? parsed.panelHeight : null;
    } catch (_error) {
      state.panelWidth = null;
      state.panelHeight = null;
    }
  }

  function persistLayoutState() {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({
      panelWidth: state.panelWidth,
      panelHeight: state.panelHeight,
    }));
  }

  function getHistoryForRequest() {
    return state.messages
      .slice(0, -1)
      .slice(-8)
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
      .map((item) => ({
        role: item.role,
        content: String(item.content),
      }));
  }

  function render() {
    if (!els.messages) return;
    toggleWidget(state.open, false);
    updateStatusBadge();
    updateAudioUi();

    if (!state.messages.length) {
      els.messages.innerHTML = `
        <article class="assistant-message system">
          Consulte PRTs, releases, módulos e FAQ pública.
        </article>
      `;
      lucide.createIcons();
      return;
    }

    els.messages.innerHTML = state.messages.map((message) => `
      <article class="assistant-message ${message.role}">
        ${escapeHtml(message.content)}
      </article>
    `).join("");

    els.messages.scrollTop = els.messages.scrollHeight;
    lucide.createIcons();
  }

  async function submitMessage() {
    const message = String(els.input?.value || "").trim();
    return submitProvidedMessage(message);
  }

  async function submitProvidedMessage(message) {
    if (!message || state.sending) return;

    const apiBaseUrl = getApiBaseUrlSafe();
    if (!apiBaseUrl) {
      notify("API base não configurada.", "error");
      return;
    }

    toggleWidget(true);
    state.sending = true;
    toggleSending(true);
    state.messages.push({ role: "user", content: message });
    if (els.input) {
      els.input.value = "";
    }
    resetInputHeight();
    render();
    persist();

    try {
      const response = await fetch(`${apiBaseUrl}/assistente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: getHistoryForRequest(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || `Falha ao consultar assistente. Status ${response.status}`);
      }

      state.messages.push({
        role: "assistant",
        content: data.resposta || "Não encontrei uma resposta útil com o contexto disponível.",
      });
      persist();
      render();
    } catch (error) {
      state.messages.push({
        role: "assistant",
        content: error.message || "Falha ao consultar o assistente.",
      });
      persist();
      render();
      notify(error.message || "Falha ao consultar o assistente.", "error");
    } finally {
      state.sending = false;
      toggleSending(false);
    }
  }

  function toggleSending(sending) {
    if (els.sendBtn) {
      els.sendBtn.disabled = sending;
      const label = els.sendBtn.querySelector("span");
      if (label) label.textContent = sending ? "Consultando..." : "Perguntar";
    }

    if (els.input) {
      els.input.disabled = sending || state.transcribing;
    }

    if (els.audioBtn) {
      els.audioBtn.disabled = sending || state.transcribing;
    }

    updateAudioUi();
    updateStatusBadge();
  }

  function toggleWidget(forceState, persistState = true) {
    state.open = typeof forceState === "boolean" ? forceState : !state.open;

    applyPanelVisibility(state.open);

    if (els.fab) {
      els.fab.setAttribute("aria-expanded", String(state.open));
    }

    if (state.open) {
      requestAnimationFrame(() => {
        els.messages.scrollTop = els.messages.scrollHeight;
        els.input?.focus();
      });
    }

    if (persistState) {
      persist();
    }

    if (els.widget) {
      els.widget.classList.toggle("assistant-widget-open", state.open);
    }

    lucide.createIcons();
  }

  function applyPanelVisibility(isOpen) {
    if (!els.panel) return;

    els.panel.classList.toggle("hidden", !isOpen);
    els.panel.hidden = !isOpen;
    els.panel.setAttribute("aria-hidden", String(!isOpen));
    els.panel.style.display = isOpen ? "grid" : "none";
    applyPanelLayout();
  }

  function applyPanelLayout() {
    if (!els.panel) return;

    const maxWidth = Math.max(MIN_WIDGET_WIDTH, Math.min(MAX_WIDGET_WIDTH, window.innerWidth - 32));
    const maxHeight = Math.max(MIN_WIDGET_HEIGHT, Math.min(MAX_WIDGET_HEIGHT, window.innerHeight - 48));

    if (state.panelWidth) {
      state.panelWidth = clampNumber(state.panelWidth, MIN_WIDGET_WIDTH, maxWidth);
      els.panel.style.width = `${state.panelWidth}px`;
    } else {
      els.panel.style.removeProperty("width");
    }

    if (state.panelHeight) {
      state.panelHeight = clampNumber(state.panelHeight, MIN_WIDGET_HEIGHT, maxHeight);
      els.panel.style.height = `${state.panelHeight}px`;
      els.panel.style.maxHeight = `${state.panelHeight}px`;
    } else {
      els.panel.style.removeProperty("height");
      els.panel.style.removeProperty("max-height");
    }
  }

  function startPanelResize(event) {
    if (!els.panel || window.innerWidth <= 640) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = els.panel.getBoundingClientRect();
    state.resizing = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };

    document.addEventListener("pointermove", handlePanelResizeMove);
    document.addEventListener("pointerup", stopPanelResize);
    document.addEventListener("pointercancel", stopPanelResize);
  }

  function handlePanelResizeMove(event) {
    if (!state.resizing || !els.panel) return;

    const nextWidth = clampNumber(
      state.resizing.startWidth - (event.clientX - state.resizing.startX),
      MIN_WIDGET_WIDTH,
      Math.min(MAX_WIDGET_WIDTH, window.innerWidth - 32)
    );

    const nextHeight = clampNumber(
      state.resizing.startHeight - (event.clientY - state.resizing.startY),
      MIN_WIDGET_HEIGHT,
      Math.min(MAX_WIDGET_HEIGHT, window.innerHeight - 48)
    );

    state.panelWidth = nextWidth;
    state.panelHeight = nextHeight;
    applyPanelLayout();
  }

  function stopPanelResize() {
    if (!state.resizing) return;

    state.resizing = false;
    persistLayoutState();
    document.removeEventListener("pointermove", handlePanelResizeMove);
    document.removeEventListener("pointerup", stopPanelResize);
    document.removeEventListener("pointercancel", stopPanelResize);
  }

  function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  async function startRecording() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      notify("Seu navegador não suporta gravação de áudio.", "error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      state.recording = true;
      state.recordingChunks = [];
      state.mediaRecorder = recorder;
      state.recordingStartedAt = Date.now();
      state.recordingTimerId = window.setInterval(updateRecordingTimer, 1000);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) {
          state.recordingChunks.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        const audioBlob = new Blob(state.recordingChunks, {
          type: recorder.mimeType || "audio/webm",
        });

        state.recording = false;
        state.mediaRecorder = null;
        clearRecordingTimer();
        updateAudioUi();
        updateStatusBadge();

        if (!audioBlob.size) {
          notify("Nenhum áudio foi capturado.", "warning");
          return;
        }

        await transcribeRecordedAudio(audioBlob);
      });

      recorder.start(250);
      updateRecordingTimer();
      updateAudioUi();
      updateStatusBadge();
      notify("Gravação iniciada.", "info");
    } catch (_error) {
      notify("Não foi possível iniciar a gravação.", "error");
    }
  }

  function stopRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") {
      return;
    }

    state.mediaRecorder.stop();
  }

  async function transcribeRecordedAudio(audioBlob) {
    state.transcribing = true;
    updateAudioUi();
    updateStatusBadge();

    try {
      const apiBaseUrl = getApiBaseUrlSafe();
      if (!apiBaseUrl) {
        throw new Error("API base não configurada.");
      }

      const extension = audioBlob.type.includes("ogg") ? "ogg" : "webm";
      const file = new File([audioBlob], `cordia-audio-${Date.now()}.${extension}`, {
        type: audioBlob.type || "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch(`${apiBaseUrl}/transcrever`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || `Falha ao transcrever áudio. Status ${response.status}`);
      }

      const transcript = String(data.transcricao || data.analise || "").trim();
      if (!transcript) {
        throw new Error("Não foi possível identificar conteúdo útil no áudio.");
      }

      if (els.input) {
        els.input.value = transcript;
      }
      autoResizeInput();

      await submitProvidedMessage(transcript);
    } catch (error) {
      notify(error.message || "Falha ao processar áudio.", "error");
    } finally {
      state.transcribing = false;
      updateAudioUi();
      updateStatusBadge();
    }
  }

  function updateRecordingTimer() {
    if (!els.recordingTime || !state.recordingStartedAt) return;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.recordingStartedAt) / 1000));
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    els.recordingTime.textContent = `${minutes}:${seconds}`;
  }

  function clearRecordingTimer() {
    if (state.recordingTimerId) {
      window.clearInterval(state.recordingTimerId);
      state.recordingTimerId = null;
    }
  }

  function updateAudioUi() {
    if (els.audioBtn) {
      els.audioBtn.classList.toggle("recording", state.recording);
      els.audioBtn.disabled = state.sending || state.transcribing;
      els.audioBtn.title = state.recording
        ? "Parar gravação"
        : state.transcribing
          ? "Transcrevendo áudio"
          : "Gravar áudio";
      els.audioBtn.setAttribute("aria-label", els.audioBtn.title);
    }

    if (els.audioLabel) {
      els.audioLabel.textContent = state.recording
        ? "Parar"
        : state.transcribing
          ? "Transcrevendo..."
          : "Áudio";
    }

    if (els.recordingPill) {
      els.recordingPill.classList.toggle("hidden", !state.recording);
    }
  }

  function updateStatusBadge() {
    if (!els.statusBadge || !els.statusLabel) return;

    els.statusBadge.classList.remove("assistant-status-online", "assistant-status-busy", "assistant-status-offline");

    let label = "Online";
    let className = "assistant-status-online";

    if (state.recording) {
      label = "Gravando";
      className = "assistant-status-busy";
    } else if (state.transcribing || state.sending) {
      label = "Processando";
      className = "assistant-status-busy";
    }

    els.statusBadge.classList.add(className);
    els.statusLabel.textContent = label;
    if (els.fabBadge) {
      els.fabBadge.textContent = label;
    }
  }

  function pickSupportedMimeType() {
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
      "audio/ogg",
    ];

    return mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function notify(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
    }
  }

  function autoResizeInput() {
    if (!els.input) return;

    els.input.style.height = "52px";
    const nextHeight = Math.min(Math.max(52, els.input.scrollHeight), 104);
    els.input.style.height = `${nextHeight}px`;
  }

  function resetInputHeight() {
    if (!els.input) return;
    els.input.style.height = "52px";
  }

  window.toggleAssistantWidget = function () {
    bindElements();
    if (!els.widget) return false;
    toggleWidget(!state.open);
    return false;
  };

  window.closeAssistantWidget = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    bindElements();
    if (!els.widget) return false;
    toggleWidget(false);
    return false;
  };

  document.addEventListener("DOMContentLoaded", init);
})();
