(function () {
  const STORAGE_KEY = "protocord_ia_assistant_v1";
  const LAYOUT_STORAGE_KEY = "protocord_ia_assistant_layout_v1";
  const MIN_WIDGET_WIDTH = 360;
  const MAX_WIDGET_WIDTH = 760;
  const MIN_WIDGET_HEIGHT = 420;
  const MAX_WIDGET_HEIGHT = 860;
  const ZNUNY_ATTENDANT_PORTAL_URL = "https://rhede.serviceup.app/portal/index.html";

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
    authenticated: false,
    recording: false,
    transcribing: false,
    mediaRecorder: null,
    recordingChunks: [],
    recordingStartedAt: 0,
    recordingTimerId: null,
    panelWidth: null,
    panelHeight: null,
    widgetX: null,
    widgetY: null,
    dragging: null,
    suppressToggleClick: false,
    recordingPointerId: null,
    audioPressActive: false,
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
    syncAssistantVisibility();
    render();
  }

  function bindElements() {
    els.widget = document.getElementById("assistant-widget");
    els.panel = document.getElementById("assistant-panel");
    els.fab = document.getElementById("assistant-fab");
    els.closeBtn = document.getElementById("assistant-close-btn");
    els.header = document.querySelector("#assistant-panel .assistant-widget-header");
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
    els.fab?.addEventListener("pointerdown", startWidgetDrag);
    els.header?.addEventListener("pointerdown", startWidgetDrag);

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

    els.audioBtn?.addEventListener("pointerdown", handleAudioPressStart);
    els.audioBtn?.addEventListener("pointerup", handleAudioPressEnd);
    els.audioBtn?.addEventListener("pointercancel", handleAudioPressCancel);
    els.audioBtn?.addEventListener("lostpointercapture", handleAudioPressCancel);
    els.audioBtn?.addEventListener("keydown", handleAudioKeyDown);
    els.audioBtn?.addEventListener("keyup", handleAudioKeyUp);
    window.addEventListener("pointerup", handleGlobalAudioPointerEnd, true);
    window.addEventListener("pointercancel", handleGlobalAudioPointerCancel, true);

    els.suggestions.forEach((button) => {
      button.addEventListener("click", async () => {
        if (!els.input) return;
        els.input.value = button.dataset.assistantPrompt || "";
        autoResizeInput();
        await submitMessage();
      });
    });

    window.addEventListener("resize", applyPanelLayout);
    window.addEventListener("resize", applyWidgetPosition);
    window.addEventListener("protocord:auth-changed", handleAuthChanged);
    autoResizeInput();
  }

  function restoreState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.messages = Array.isArray(parsed.messages) ?parsed.messages.slice(-20) : [];
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
      state.panelWidth = Number.isFinite(parsed.panelWidth) ?parsed.panelWidth : null;
      state.panelHeight = Number.isFinite(parsed.panelHeight) ?parsed.panelHeight : null;
      state.widgetX = Number.isFinite(parsed.widgetX) ?parsed.widgetX : null;
      state.widgetY = Number.isFinite(parsed.widgetY) ?parsed.widgetY : null;
    } catch (_error) {
      state.panelWidth = null;
      state.panelHeight = null;
      state.widgetX = null;
      state.widgetY = null;
    }
  }

  function persistLayoutState() {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({
      panelWidth: state.panelWidth,
      panelHeight: state.panelHeight,
      widgetX: state.widgetX,
      widgetY: state.widgetY,
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
        ${renderMessageContent(message)}
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
      if (label) label.textContent = sending ?"Consultando..." : "Perguntar";
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
    if (!state.authenticated) {
      return;
    }

    state.open = typeof forceState === "boolean" ?forceState : !state.open;

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
    els.panel.style.display = isOpen ?"grid" : "none";
    applyPanelLayout();
    requestAnimationFrame(applyWidgetPosition);
  }

  function isAuthenticated() {
    try {
      if (typeof window.hasActiveAuthSession === "function") {
        return window.hasActiveAuthSession();
      }
    } catch (_error) {}

    return false;
  }

  function handleAuthChanged(event) {
    state.authenticated = Boolean(event?.detail?.authenticated);
    syncAssistantVisibility();
  }

  function syncAssistantVisibility() {
    state.authenticated = isAuthenticated();

    if (!els.widget) return;

    els.widget.hidden = !state.authenticated;
    els.widget.classList.toggle("hidden", !state.authenticated);
    els.widget.setAttribute("aria-hidden", String(!state.authenticated));

    if (!state.authenticated) {
      state.open = false;
      applyPanelVisibility(false);
      return;
    }

    requestAnimationFrame(applyWidgetPosition);
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

  function applyWidgetPosition() {
    if (!els.widget || !state.authenticated) return;

    if (!Number.isFinite(state.widgetX) || !Number.isFinite(state.widgetY)) {
      els.widget.style.removeProperty("left");
      els.widget.style.removeProperty("top");
      els.widget.style.removeProperty("right");
      els.widget.style.removeProperty("bottom");
      return;
    }

    const rect = els.widget.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);

    state.widgetX = clampNumber(state.widgetX, 8, maxLeft);
    state.widgetY = clampNumber(state.widgetY, 8, maxTop);

    els.widget.style.left = `${state.widgetX}px`;
    els.widget.style.top = `${state.widgetY}px`;
    els.widget.style.right = "auto";
    els.widget.style.bottom = "auto";
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

  function startWidgetDrag(event) {
    if (!els.widget || !state.authenticated || event.button !== 0) return;

    const target = event.target instanceof Element ?event.target : null;
    if (
      event.currentTarget === els.header &&
      target?.closest("button, input, textarea, a, [role='button']")
    ) {
      return;
    }

    const rect = els.widget.getBoundingClientRect();
    state.dragging = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      dragged: false,
    };

    document.addEventListener("pointermove", handleWidgetDragMove);
    document.addEventListener("pointerup", stopWidgetDrag);
    document.addEventListener("pointercancel", stopWidgetDrag);
  }

  function handleWidgetDragMove(event) {
    if (!state.dragging || !els.widget) return;

    const nextX = state.dragging.startLeft + (event.clientX - state.dragging.startX);
    const nextY = state.dragging.startTop + (event.clientY - state.dragging.startY);

    if (!state.dragging.dragged) {
      const distance = Math.abs(event.clientX - state.dragging.startX) + Math.abs(event.clientY - state.dragging.startY);
      state.dragging.dragged = distance > 4;
    }

    state.widgetX = nextX;
    state.widgetY = nextY;
    applyWidgetPosition();
  }

  function stopWidgetDrag() {
    if (!state.dragging) return;

    if (state.dragging.dragged) {
      state.suppressToggleClick = true;
      persistLayoutState();
      window.setTimeout(() => {
        state.suppressToggleClick = false;
      }, 120);
    }

    state.dragging = null;
    document.removeEventListener("pointermove", handleWidgetDragMove);
    document.removeEventListener("pointerup", stopWidgetDrag);
    document.removeEventListener("pointercancel", stopWidgetDrag);
  }

  function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function renderMessageContent(message) {
    const content = String(message?.content || "");
    const normalizedContent = isZnunyAuthFailureMessage(content)
      ?content.replace("/znuny/index.pl", "/portal/index.html")
      : content;
    const formattedContent = escapeHtml(normalizedContent).replace(/\n/g, "<br>");

    if (message?.role !== "assistant" || !isZnunyAuthFailureMessage(content)) {
      return formattedContent;
    }

    return `
      <div>${formattedContent}</div>
      <div style="margin-top:12px;padding:12px 14px;border-radius:14px;border:1px solid rgba(78,161,255,0.14);background:rgba(10,22,43,0.72);">
        <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:rgba(126,231,255,0.84);">Suporte ao login</div>
        <div style="margin-top:6px;font-size:0.86rem;line-height:1.55;color:rgba(225,235,250,0.84);">
          O vídeo mostra que o acesso manual do atendente acontece no portal `/portal/index.html`.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <button type="button" data-assistant-open-znuny-portal="true" style="display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(34,211,238,0.18);background:linear-gradient(135deg, rgba(8,145,178,0.26), rgba(37,99,235,0.24));color:rgba(244,249,255,0.96);font-size:0.8rem;font-weight:700;padding:9px 12px;cursor:pointer;">
            Abrir portal do atendente
          </button>
        </div>
      </div>
    `;
  }

  function isZnunyAuthFailureMessage(content) {
    return /autentica..o autom..tica falhou/i.test(String(content || "")) && /znuny/i.test(String(content || ""));
  }

  async function handleAudioPressStart(event) {
    if (event.button !== 0 || state.transcribing || state.sending || state.recording) {
      return;
    }

    event.preventDefault();
    state.audioPressActive = true;
    state.recordingPointerId = event.pointerId;
    els.audioBtn?.setPointerCapture?.(event.pointerId);
    updateAudioUi();
    await startRecording();
  }

  function handleAudioPressEnd(event) {
    state.audioPressActive = false;
    updateAudioUi();
    if (!state.recording) return;
    if (state.recordingPointerId !== null && event.pointerId !== state.recordingPointerId) return;

    event.preventDefault();
    releaseAudioPointer(event.pointerId);
    stopRecording();
  }

  function handleAudioPressCancel(event) {
    state.audioPressActive = false;
    updateAudioUi();
    if (state.recordingPointerId !== null && event?.pointerId !== undefined && event.pointerId !== state.recordingPointerId) {
      return;
    }

    releaseAudioPointer(event?.pointerId);
    if (state.recording) {
      stopRecording();
    }
  }

  function handleAudioKeyDown(event) {
    if (event.repeat) return;
    if (event.key !== " " && event.key !== "Enter") return;

    event.preventDefault();
    handleAudioPressStart({ button: 0, pointerId: -1, preventDefault() {} });
  }

  function handleAudioKeyUp(event) {
    if (event.key !== " " && event.key !== "Enter") return;

    event.preventDefault();
    handleAudioPressEnd({ pointerId: -1, preventDefault() {} });
  }

  function handleGlobalAudioPointerEnd(event) {
    if (!state.audioPressActive || state.recordingPointerId === null) return;
    handleAudioPressEnd(event);
  }

  function handleGlobalAudioPointerCancel(event) {
    if (!state.audioPressActive || state.recordingPointerId === null) return;
    handleAudioPressCancel(event);
  }

  function releaseAudioPointer(pointerId) {
    if (pointerId !== undefined && pointerId !== null) {
      try {
        els.audioBtn?.releasePointerCapture?.(pointerId);
      } catch (_error) {}
    }

    state.recordingPointerId = null;
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
        ?new MediaRecorder(stream, { mimeType })
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
        state.recordingPointerId = null;
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
      if (!state.audioPressActive) {
        releaseAudioPointer(state.recordingPointerId);
        stopRecording();
      }
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
        throw new Error("API base nao configurada.");
      }

      const extension = audioBlob.type.includes("ogg") ?"ogg" : "webm";
      const file = new File([audioBlob], `cordia-audio-${Date.now()}.${extension}`, {
        type: audioBlob.type || "audio/webm",
      });

      const data = await transcribeAudioFile(apiBaseUrl, file);
      const transcript = String(data.transcricao || data.texto || data.analise || "").trim();
      if (!transcript) {
        throw new Error("Nao foi possivel identificar conteudo util no audio.");
      }

      if (els.input) {
        els.input.value = transcript;
      }
      autoResizeInput();

      await submitProvidedMessage(transcript);
    } catch (error) {
      notify(error.message || "Falha ao processar audio.", "error");
    } finally {
      state.transcribing = false;
      updateAudioUi();
      updateStatusBadge();
    }
  }

  async function transcribeAudioFile(apiBaseUrl, file) {
    try {
      return await requestDirectAssistantTranscription(apiBaseUrl, file);
    } catch (error) {
      if (!shouldFallbackToBlobAssistantUpload(error)) {
        throw error;
      }

      const blobUpload = await uploadAudioBlobForAssistant(apiBaseUrl, file);
      return await requestBlobTranscriptionForAssistant(apiBaseUrl, blobUpload, file);
    }
  }

  async function uploadAudioBlobForAssistant(apiBaseUrl, file) {
    const { upload } = await import("https://esm.sh/@vercel/blob/client?target=es2022");
    const pathname = `audios/${Date.now()}-${String(file.name || "audio.webm").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_")}`;
    return upload(pathname, file, {
      access: "public",
      handleUploadUrl: `${apiBaseUrl}/blob-upload`,
      multipart: true,
    });
  }

  async function requestBlobTranscriptionForAssistant(apiBaseUrl, blobUpload, file) {
    const response = await fetch(`${apiBaseUrl}/transcrever`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blobUrl: blobUpload.url,
        pathname: blobUpload.pathname || "",
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.sucesso) {
      const message = data?.erro || `Falha ao transcrever audio. Status ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    return data;
  }

  async function requestDirectAssistantTranscription(apiBaseUrl, file) {
    const formData = new FormData();
    formData.append("audio", file);

    let response = await fetch(`${apiBaseUrl}/transcricao-direta`, {
      method: "POST",
      body: formData,
    });

    let data = await response.json().catch(() => null);
    if ((response.status === 404 || response.status === 405) && !data?.sucesso) {
      response = await fetch(`${apiBaseUrl}/transcrever`, {
        method: "POST",
        body: formData,
      });
      data = await response.json().catch(() => null);
    }

    if (!response.ok || !data?.sucesso) {
      throw new Error(data?.erro || `Falha ao transcrever audio. Status ${response.status}`);
    }

    return data;
  }

  function shouldFallbackToBlobAssistantUpload(error) {
    return (
      error?.status === 400 ||
      error?.status === 404 ||
      error?.status === 405 ||
      error?.status === 408 ||
      error?.status === 413 ||
      error?.status === 429 ||
      error?.status >= 500 ||
      /blob|upload|token|multipart|network|fetch|gateway|payload too large/i.test(String(error?.message || ""))
    );
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
      els.audioBtn.setAttribute("data-pressing", state.audioPressActive ?"true" : "false");
      els.audioBtn.disabled = state.sending || state.transcribing;
      els.audioBtn.title = state.recording
        ?"Parar grava??o"
        : state.transcribing
          ?"Transcrevendo ?udio"
          : "Gravar áudio";
      els.audioBtn.setAttribute("aria-label", els.audioBtn.title);
    }

    if (els.audioLabel) {
      els.audioLabel.textContent = state.recording
        ?"Parar"
        : state.transcribing
          ?"Transcrevendo..."
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

  document.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element
      ?event.target.closest("[data-assistant-open-znuny-portal='true']")
      : null;
    if (!trigger) return;

    event.preventDefault();
    window.open(ZNUNY_ATTENDANT_PORTAL_URL, "_blank", "noopener,noreferrer");
  });

  window.toggleAssistantWidget = function () {
    bindElements();
    if (!els.widget) return false;
    if (state.suppressToggleClick || !state.authenticated) {
      return false;
    }
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
    if (!state.authenticated) return false;
    toggleWidget(false);
    return false;
  };

  document.addEventListener("DOMContentLoaded", init);
})();
