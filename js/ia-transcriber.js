(function () {
  const STORAGE_KEY = "protocord_ia_assistant_v1";

  function getApiBaseUrlSafe() {
    try {
      if (typeof window.getProtocordApiBaseUrl === "function") {
        return window.getProtocordApiBaseUrl();
      }
    } catch (_) {}
    return "";
  }

  const state = {
    messages: [],
    sending: false,
    motion: null,
    initialized: false,
    originalMarkup: "",
    recording: false,
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    transcriptionBusy: false,
  };

  const els = {};

  function bindElements() {
    els.page = document.getElementById("pagina-assistente");
    els.messages = document.getElementById("assistant-messages");
    els.form = document.getElementById("assistant-form");
    els.input = document.getElementById("assistant-input");
    els.sendBtn = document.getElementById("assistant-send-btn");
    els.clearBtn = document.getElementById("assistant-clear-btn");
    els.micBtn = document.getElementById("assistant-mic-btn");
    els.voiceStatus = document.getElementById("assistant-voice-status");
    els.suggestions = Array.from(document.querySelectorAll("#pagina-assistente [data-assistant-prompt]"));
  }

  function init() {
    bindElements();
    if (!els.page) return null;

    if (state.initialized && els.page.dataset.assistantEnhanced === "true") {
      return api;
    }

    if (!state.originalMarkup) {
      state.originalMarkup = els.page.innerHTML;
    }

    injectStyles();
    enhanceLayout();
    bindElements();
    restoreState();
    bindEvents();
    render();
    bootMotion();

    state.initialized = true;
    els.page.dataset.assistantEnhanced = "true";

    return api;
  }

  function destroy() {
    bindElements();
    if (!els.page) return;

    stopVoiceCapture(true);

    if (state.originalMarkup) {
      els.page.innerHTML = state.originalMarkup;
    }

    els.page.classList.remove("assistant-ui-upgraded");
    delete els.page.dataset.assistantEnhanced;
    delete els.page.dataset.enhanced;

    state.initialized = false;
    state.motion = null;
    state.recording = false;
    state.mediaRecorder = null;
    state.mediaStream = null;
    state.audioChunks = [];
    state.transcriptionBusy = false;

    bindElements();
  }

  function bindEvents() {
    if (!els.form || els.form.dataset.bound === "true") return;
    els.form.dataset.bound = "true";

    els.form.addEventListener("submit", async function (event) {
      event.preventDefault();
      await submitMessage();
    });

    els.clearBtn?.addEventListener("click", function () {
      state.messages = [];
      persist();
      render();
      notify("Conversa limpa.", "success");
    });

    els.micBtn?.addEventListener("click", async function () {
      if (state.transcriptionBusy || state.sending) return;

      if (state.recording) {
        stopVoiceCapture(false);
      } else {
        await startVoiceCapture();
      }
    });

    els.suggestions.forEach(function (button) {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";

      button.addEventListener("click", async function () {
        if (!els.input) return;
        els.input.value = button.dataset.assistantPrompt || "";
        syncInputState();
        autoResizeTextarea();
        await submitMessage();
      });
    });

    els.input?.addEventListener("focus", function () {
      els.form?.classList.add("assistant-form-focus");
      animateFocus(true);
    });

    els.input?.addEventListener("blur", function () {
      els.form?.classList.remove("assistant-form-focus");
      animateFocus(false);
    });

    els.input?.addEventListener("input", function () {
      syncInputState();
      autoResizeTextarea();
    });

    els.sendBtn?.addEventListener("mouseenter", function () {
      animateHover(els.sendBtn, 1.02, -2);
    });

    els.sendBtn?.addEventListener("mouseleave", function () {
      animateHover(els.sendBtn, 1, 0);
    });

    els.clearBtn?.addEventListener("mouseenter", function () {
      animateHover(els.clearBtn, 1.01, -1);
    });

    els.clearBtn?.addEventListener("mouseleave", function () {
      animateHover(els.clearBtn, 1, 0);
    });

    els.micBtn?.addEventListener("mouseenter", function () {
      animateHover(els.micBtn, 1.02, -2);
    });

    els.micBtn?.addEventListener("mouseleave", function () {
      animateHover(els.micBtn, 1, 0);
    });

    autoResizeTextarea();
    syncInputState();
    syncVoiceUi();
  }

  function restoreState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.messages = Array.isArray(parsed.messages) ? parsed.messages.slice(-20) : [];
    } catch (_) {
      state.messages = [];
    }
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages: state.messages.slice(-20),
      })
    );
  }

  function getHistoryForRequest() {
    return state.messages
      .slice(0, -1)
      .slice(-8)
      .filter(function (item) {
        return item && (item.role === "user" || item.role === "assistant") && item.content;
      })
      .map(function (item) {
        return {
          role: item.role,
          content: String(item.content),
        };
      });
  }

  function render() {
    if (!els.messages) return;

    if (!state.messages.length) {
      els.messages.innerHTML = `
        <article class="assistant-message system assistant-empty-state">
          <div class="assistant-empty-icon">
            <i data-lucide="sparkles"></i>
          </div>
          <div class="assistant-empty-badge">CORDIA</div>
          <h3>Consulta operacional com contexto híbrido</h3>
          <p>Consulte PRTs, releases, módulos e FAQ pública.</p>
        </article>
      `;
      els.messages.scrollTop = 0;
      if (window.lucide) lucide.createIcons();
      animateMessageEntry();
      syncVoiceUi();
      return;
    }

    els.messages.innerHTML = state.messages
      .map(function (message, index) {
        const label = message.role === "user" ? "Pergunta" : "Resposta";

        return `
          <article class="assistant-message ${message.role}" data-message-index="${index}">
            <div class="assistant-message-shell">
              <div class="assistant-message-role">${label}</div>
              <div class="assistant-message-content">${formatMessage(message.content)}</div>
            </div>
          </article>
        `;
      })
      .join("");

    els.messages.scrollTop = els.messages.scrollHeight;
    if (window.lucide) lucide.createIcons();
    animateMessageEntry();
    syncVoiceUi();
  }

  async function submitMessage() {
    const message = String(els.input?.value || "").trim();
    if (!message || state.sending || state.transcriptionBusy) return;

    const apiBaseUrl = getApiBaseUrlSafe();
    if (!apiBaseUrl) {
      notify("API base não configurada.", "error");
      return;
    }

    state.sending = true;
    toggleSending(true);

    state.messages.push({ role: "user", content: message });
    els.input.value = "";
    autoResizeTextarea();
    syncInputState();
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

      const data = await response.json().catch(function () {
        return null;
      });

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
      els.input?.focus();
    }
  }

  function toggleSending(sending) {
    if (els.sendBtn) {
      els.sendBtn.disabled = sending;
      els.sendBtn.classList.toggle("is-loading", sending);

      const label = els.sendBtn.querySelector("span");
      if (label) {
        label.textContent = sending ? "Consultando..." : "Perguntar";
      }
    }

    if (els.input) {
      els.input.disabled = sending || state.transcriptionBusy;
    }

    if (els.form) {
      els.form.classList.toggle("is-sending", sending);
    }

    syncVoiceUi();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMessage(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }

  function notify(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
    }
  }

  function syncInputState() {
    if (!els.form || !els.input) return;
    const hasValue = String(els.input.value || "").trim().length > 0;
    els.form.classList.toggle("assistant-form-has-value", hasValue);
  }

  function autoResizeTextarea() {
    if (!els.input) return;
    els.input.style.height = "0px";
    els.input.style.height = Math.min(Math.max(120, els.input.scrollHeight), 260) + "px";
  }

  function syncVoiceUi() {
    if (els.micBtn) {
      els.micBtn.disabled = state.sending || state.transcriptionBusy;
      els.micBtn.classList.toggle("assistant-btn-recording", state.recording);
      els.micBtn.classList.toggle("assistant-btn-busy", state.transcriptionBusy);

      const icon = els.micBtn.querySelector("[data-assistant-mic-icon]");
      const label = els.micBtn.querySelector("[data-assistant-mic-label]");

      if (icon) {
        icon.setAttribute("data-lucide", state.recording ? "square" : "mic");
      }

      if (label) {
        if (state.transcriptionBusy) {
          label.textContent = "Transcrevendo...";
        } else if (state.recording) {
          label.textContent = "Parar gravação";
        } else {
          label.textContent = "Falar por voz";
        }
      }
    }

    if (els.voiceStatus) {
      if (state.transcriptionBusy) {
        els.voiceStatus.textContent = "Transcrevendo áudio...";
        els.voiceStatus.classList.add("is-busy");
        els.voiceStatus.classList.remove("is-recording");
      } else if (state.recording) {
        els.voiceStatus.textContent = "Gravando voz...";
        els.voiceStatus.classList.add("is-recording");
        els.voiceStatus.classList.remove("is-busy");
      } else {
        els.voiceStatus.textContent = "Digite ou fale sua pergunta";
        els.voiceStatus.classList.remove("is-recording");
        els.voiceStatus.classList.remove("is-busy");
      }
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  async function startVoiceCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notify("Seu navegador não suporta captura de áudio.", "error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedRecordingMimeType();

      state.audioChunks = [];
      state.mediaStream = stream;
      state.mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      state.mediaRecorder.addEventListener("dataavailable", function (event) {
        if (event.data && event.data.size > 0) {
          state.audioChunks.push(event.data);
        }
      });

      state.mediaRecorder.addEventListener("stop", async function () {
        const blob = new Blob(state.audioChunks, {
          type: state.audioChunks[0]?.type || mimeType || "audio/webm",
        });

        state.audioChunks = [];
        await transcribeRecordedAudio(blob);
      });

      state.mediaRecorder.start();
      state.recording = true;
      syncVoiceUi();
      notify("Gravação iniciada.", "info");
    } catch (error) {
      notify("Não foi possível acessar o microfone.", "error");
    }
  }

  function stopVoiceCapture(silent) {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.stop();
    }

    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(function (track) {
        track.stop();
      });
    }

    state.recording = false;
    state.mediaStream = null;
    state.mediaRecorder = null;
    syncVoiceUi();

    if (!silent) {
      notify("Gravação finalizada.", "info");
    }
  }

  function getSupportedRecordingMimeType() {
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    for (const mimeType of mimeTypes) {
      try {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(mimeType)) {
          return mimeType;
        }
      } catch (_) {}
    }

    return "";
  }

  async function transcribeRecordedAudio(blob) {
    const apiBaseUrl = getApiBaseUrlSafe();
    if (!apiBaseUrl) {
      notify("API base não configurada.", "error");
      return;
    }

    if (!blob || !blob.size) {
      notify("Nenhum áudio válido foi capturado.", "warning");
      return;
    }

    state.transcriptionBusy = true;
    syncVoiceUi();

    try {
      const text = await sendBlobToTranscription(blob, apiBaseUrl);
      if (!text) {
        throw new Error("Não foi possível obter a transcrição do áudio.");
      }

      if (els.input) {
        const current = String(els.input.value || "").trim();
        els.input.value = current ? `${current}\n${text}` : text;
        autoResizeTextarea();
        syncInputState();
        els.input.focus();
      }

      notify("Transcrição concluída.", "success");
    } catch (error) {
      notify(error.message || "Falha ao transcrever o áudio.", "error");
    } finally {
      state.transcriptionBusy = false;
      syncVoiceUi();
    }
  }

  async function sendBlobToTranscription(blob, apiBaseUrl) {
    const candidatePaths = [
      "/transcrever",
      "/transcribe",
      "/api/transcrever",
      "/api/transcribe",
    ];

    const candidateFieldNames = ["audio", "file"];

    let lastError = null;

    for (const path of candidatePaths) {
      for (const fieldName of candidateFieldNames) {
        try {
          const formData = new FormData();
          const extension = resolveAudioExtension(blob.type);
          const filename = `assistente-voz.${extension}`;
          formData.append(fieldName, blob, filename);

          const response = await fetch(`${apiBaseUrl}${path}`, {
            method: "POST",
            body: formData,
          });

          const raw = await response.text();
          let data = null;

          try {
            data = raw ? JSON.parse(raw) : null;
          } catch (_) {
            data = null;
          }

          if (!response.ok) {
            throw new Error(
              data?.erro ||
                data?.error ||
                `Falha na transcrição (${response.status}) em ${path}`
            );
          }

          const text =
            data?.texto ||
            data?.transcricao ||
            data?.transcription ||
            data?.conteudo ||
            data?.content ||
            data?.resumo ||
            "";

          if (String(text || "").trim()) {
            return String(text).trim();
          }

          throw new Error(`Resposta sem texto utilizável em ${path}`);
        } catch (error) {
          lastError = error;
        }
      }
    }

    throw lastError || new Error("Nenhuma rota de transcrição respondeu corretamente.");
  }

  function resolveAudioExtension(mimeType) {
    const value = String(mimeType || "").toLowerCase();

    if (value.includes("ogg")) return "ogg";
    if (value.includes("mp4")) return "mp4";
    if (value.includes("mpeg")) return "mp3";
    if (value.includes("wav")) return "wav";
    return "webm";
  }

  function injectStyles() {
    if (document.getElementById("assistant-ui-upgrade-styles")) return;

    const style = document.createElement("style");
    style.id = "assistant-ui-upgrade-styles";
    style.type = "text/css";
    style.textContent = `
      #pagina-assistente.assistant-ui-upgraded {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 18px;
        isolation: isolate;
      }

      #pagina-assistente.assistant-ui-upgraded::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 18% 8%, rgba(59,130,246,.10), transparent 28%),
          radial-gradient(circle at 82% 12%, rgba(34,211,238,.08), transparent 24%),
          radial-gradient(circle at 50% 100%, rgba(37,99,235,.10), transparent 32%);
        z-index: 0;
      }

      #pagina-assistente.assistant-ui-upgraded > * {
        position: relative;
        z-index: 1;
      }

      #pagina-assistente .assistant-hero {
        position: relative;
        overflow: hidden;
        border-radius: 28px;
        border: 1px solid rgba(59,130,246,.14);
        background:
          linear-gradient(180deg, rgba(8,19,42,.92), rgba(5,14,32,.96));
        box-shadow:
          0 18px 42px rgba(2,6,23,.35),
          inset 0 1px 0 rgba(255,255,255,.03),
          0 0 0 1px rgba(59,130,246,.05);
        padding: 28px 28px 22px;
      }

      #pagina-assistente .assistant-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at top left, rgba(34,211,238,.10), transparent 30%),
          radial-gradient(circle at right center, rgba(59,130,246,.10), transparent 28%);
      }

      #pagina-assistente .assistant-hero-inner {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }

      #pagina-assistente .assistant-hero-copy {
        flex: 1 1 520px;
        min-width: 280px;
      }

      #pagina-assistente .assistant-eyebrow {
        margin-bottom: 10px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
        color: #62ddff;
      }

      #pagina-assistente .assistant-hero-title {
        margin: 0 0 10px;
        font-size: clamp(28px, 2vw, 38px);
        line-height: 1.08;
        font-weight: 800;
        color: rgba(245,250,255,.96);
      }

      #pagina-assistente .assistant-hero-subtitle {
        margin: 0;
        font-size: 14px;
        line-height: 1.7;
        color: rgba(184,204,234,.82);
        max-width: 760px;
      }

      #pagina-assistente .assistant-hero-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      #pagina-assistente .assistant-hero-tag {
        display: inline-flex;
        align-items: center;
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(59,130,246,.18);
        background: rgba(17,34,68,.48);
        color: rgba(226,236,255,.92);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
        backdrop-filter: blur(8px);
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      #pagina-assistente .assistant-hero-tag:hover {
        transform: translateY(-1px);
        border-color: rgba(96,165,250,.26);
        box-shadow: 0 0 18px rgba(59,130,246,.10);
      }

      #pagina-assistente .assistant-panel {
        position: relative;
        overflow: hidden;
        border-radius: 28px;
        border: 1px solid rgba(59,130,246,.12);
        background:
          linear-gradient(180deg, rgba(6,16,36,.94), rgba(4,12,28,.98));
        box-shadow:
          0 18px 40px rgba(2,6,23,.28),
          inset 0 1px 0 rgba(255,255,255,.02);
      }

      #pagina-assistente .assistant-panel::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(180deg, rgba(59,130,246,.05), transparent 24%),
          radial-gradient(circle at top center, rgba(34,211,238,.05), transparent 24%);
      }

      #pagina-assistente .assistant-messages {
        min-height: 380px;
        max-height: min(58vh, 760px);
        overflow: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        scroll-behavior: smooth;
      }

      #pagina-assistente .assistant-messages::-webkit-scrollbar {
        width: 10px;
      }

      #pagina-assistente .assistant-messages::-webkit-scrollbar-thumb {
        background: rgba(96,165,250,.18);
        border-radius: 999px;
      }

      #pagina-assistente .assistant-empty-state {
        min-height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        border-radius: 22px;
        border: 1px dashed rgba(96,165,250,.16);
        background:
          radial-gradient(circle at center, rgba(59,130,246,.10), transparent 56%),
          rgba(8,19,42,.35);
        padding: 36px 24px;
      }

      #pagina-assistente .assistant-empty-icon {
        width: 54px;
        height: 54px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 18px;
        margin-bottom: 12px;
        color: #7ee7ff;
        background: rgba(20,42,82,.48);
        border: 1px solid rgba(96,165,250,.18);
      }

      #pagina-assistente .assistant-empty-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 96px;
        height: 32px;
        margin-bottom: 10px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(96,165,250,.18);
        background: rgba(20,42,82,.44);
        color: #64deff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      #pagina-assistente .assistant-empty-state h3 {
        margin: 0 0 8px;
        color: rgba(245,250,255,.96);
        font-size: 24px;
        line-height: 1.2;
      }

      #pagina-assistente .assistant-empty-state p {
        margin: 0;
        color: rgba(182,203,234,.78);
        font-size: 14px;
        line-height: 1.7;
        max-width: 540px;
      }

      #pagina-assistente .assistant-message {
        display: flex;
      }

      #pagina-assistente .assistant-message.user {
        justify-content: flex-end;
      }

      #pagina-assistente .assistant-message.assistant,
      #pagina-assistente .assistant-message.system {
        justify-content: flex-start;
      }

      #pagina-assistente .assistant-message-shell {
        max-width: min(82%, 860px);
        border-radius: 20px;
        padding: 16px 18px 15px;
        backdrop-filter: blur(10px);
      }

      #pagina-assistente .assistant-message.user .assistant-message-shell {
        border: 1px solid rgba(34,211,238,.16);
        background: linear-gradient(135deg, rgba(30,64,175,.34), rgba(37,99,235,.22));
      }

      #pagina-assistente .assistant-message.assistant .assistant-message-shell,
      #pagina-assistente .assistant-message.system .assistant-message-shell {
        border: 1px solid rgba(59,130,246,.14);
        background: linear-gradient(180deg, rgba(13,27,54,.88), rgba(8,18,38,.94));
      }

      #pagina-assistente .assistant-message-role {
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
        color: rgba(121,189,255,.88);
      }

      #pagina-assistente .assistant-message.user .assistant-message-role {
        color: #73e3ff;
      }

      #pagina-assistente .assistant-message-content {
        color: rgba(235,242,255,.95);
        line-height: 1.72;
        font-size: 14px;
        word-break: break-word;
      }

      #pagina-assistente .assistant-composer {
        padding: 18px 20px 20px;
        border-top: 1px solid rgba(59,130,246,.10);
        background: linear-gradient(180deg, rgba(8,18,37,.45), rgba(5,14,29,.72));
      }

      #pagina-assistente .assistant-form-shell {
        position: relative;
        border-radius: 22px;
        border: 1px solid rgba(59,130,246,.12);
        background: linear-gradient(180deg, rgba(6,16,33,.98), rgba(6,15,30,.96));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.02),
          0 12px 28px rgba(2,6,23,.16);
        transition:
          border-color 180ms ease,
          box-shadow 220ms ease,
          transform 180ms ease;
      }

      #pagina-assistente .assistant-form-shell.assistant-form-focus,
      #pagina-assistente .assistant-form-shell.assistant-form-has-value {
        border-color: rgba(96,165,250,.22);
      }

      #pagina-assistente .assistant-form-shell.is-sending {
        opacity: .92;
      }

      #pagina-assistente .assistant-input {
        width: 100%;
        min-height: 120px;
        max-height: 260px;
        resize: none;
        border: 0;
        outline: 0;
        background: transparent;
        color: rgba(240,247,255,.96);
        padding: 18px 18px 12px;
        font-size: 14px;
        line-height: 1.7;
      }

      #pagina-assistente .assistant-input::placeholder {
        color: rgba(162,186,224,.48);
      }

      #pagina-assistente .assistant-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 14px 14px;
        flex-wrap: wrap;
      }

      #pagina-assistente .assistant-toolbar-meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(156,183,224,.72);
        padding-left: 4px;
      }

      #pagina-assistente .assistant-voice-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 28px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(59,130,246,.14);
        background: rgba(12,26,51,.52);
      }

      #pagina-assistente .assistant-voice-status::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(148,163,184,.75);
        box-shadow: 0 0 0 rgba(34,211,238,0);
      }

      #pagina-assistente .assistant-voice-status.is-recording::before {
        background: #fb7185;
        box-shadow: 0 0 16px rgba(251,113,133,.45);
      }

      #pagina-assistente .assistant-voice-status.is-busy::before {
        background: #22d3ee;
        box-shadow: 0 0 16px rgba(34,211,238,.45);
      }

      #pagina-assistente .assistant-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
        flex-wrap: wrap;
      }

      #pagina-assistente .assistant-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 42px;
        padding: 0 16px;
        border-radius: 14px;
        border: 1px solid rgba(59,130,246,.14);
        background: rgba(12,26,51,.72);
        color: rgba(231,239,255,.94);
        font-weight: 700;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          box-shadow 180ms ease,
          background 180ms ease,
          opacity 180ms ease;
      }

      #pagina-assistente .assistant-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: rgba(96,165,250,.24);
        box-shadow: 0 0 18px rgba(59,130,246,.10);
      }

      #pagina-assistente .assistant-btn:disabled {
        opacity: .7;
        cursor: not-allowed;
      }

      #pagina-assistente .assistant-btn-primary {
        border-color: rgba(34,211,238,.14);
        background: linear-gradient(135deg, rgba(56,189,248,.94), rgba(59,130,246,.88));
        color: #061423;
        box-shadow:
          0 10px 24px rgba(37,99,235,.22),
          0 0 24px rgba(34,211,238,.12);
      }

      #pagina-assistente .assistant-btn-primary:hover:not(:disabled) {
        box-shadow:
          0 12px 26px rgba(37,99,235,.24),
          0 0 30px rgba(34,211,238,.16);
      }

      #pagina-assistente .assistant-btn-primary.is-loading {
        filter: saturate(.92);
      }

      #pagina-assistente .assistant-btn-voice {
        border-color: rgba(34,211,238,.16);
        background:
          linear-gradient(135deg, rgba(10,26,53,.94), rgba(15,36,72,.88));
      }

      #pagina-assistente .assistant-btn-voice.assistant-btn-recording {
        border-color: rgba(251,113,133,.28);
        background:
          linear-gradient(135deg, rgba(76,29,49,.96), rgba(127,29,29,.82));
        box-shadow:
          0 0 0 1px rgba(251,113,133,.10),
          0 0 24px rgba(251,113,133,.18);
      }

      #pagina-assistente .assistant-btn-voice.assistant-btn-busy {
        border-color: rgba(34,211,238,.28);
        box-shadow:
          0 0 0 1px rgba(34,211,238,.10),
          0 0 24px rgba(34,211,238,.18);
      }

      #pagina-assistente .assistant-hidden-suggestions {
        display: none !important;
      }

      @media (max-width: 960px) {
        #pagina-assistente .assistant-hero {
          padding: 22px 18px 18px;
        }

        #pagina-assistente .assistant-messages {
          min-height: 320px;
          padding: 18px;
        }

        #pagina-assistente .assistant-message-shell {
          max-width: 100%;
        }

        #pagina-assistente .assistant-composer {
          padding: 16px;
        }

        #pagina-assistente .assistant-toolbar {
          padding: 0 10px 10px;
        }

        #pagina-assistente .assistant-actions {
          width: 100%;
          justify-content: flex-end;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function enhanceLayout() {
    if (!els.page || els.page.dataset.enhanced === "true") return;
    els.page.dataset.enhanced = "true";
    els.page.classList.add("assistant-ui-upgraded");

    hideSuggestionsSection();

    const originalMessages = els.messages;
    const originalForm = els.form;
    const originalInput = els.input;
    const originalSendBtn = els.sendBtn;
    const originalClearBtn = els.clearBtn;

    const hero = document.createElement("section");
    hero.className = "assistant-hero";
    hero.setAttribute("data-assistant-animate", "hero");
    hero.innerHTML = `
      <div class="assistant-hero-inner">
        <div class="assistant-hero-copy">
          <div class="assistant-eyebrow">CordIA</div>
          <h1 class="assistant-hero-title">Consulta operacional com contexto híbrido</h1>
          <p class="assistant-hero-subtitle">Pergunte por PRTs, releases, módulos e FAQ pública.</p>
        </div>
        <div class="assistant-hero-tags">
          <span class="assistant-hero-tag">Interno</span>
          <span class="assistant-hero-tag">FAQ ZNUNY</span>
          <span class="assistant-hero-tag">Pesquisa assistida</span>
        </div>
      </div>
    `;

    const panel = document.createElement("section");
    panel.className = "assistant-panel";
    panel.setAttribute("data-assistant-animate", "panel");

    const messagesWrapper = document.createElement("div");
    messagesWrapper.id = "assistant-messages";
    messagesWrapper.className = "assistant-messages";

    const composer = document.createElement("div");
    composer.className = "assistant-composer";

    const form = document.createElement("form");
    form.id = "assistant-form";
    form.className = "assistant-form-shell";
    form.setAttribute("autocomplete", "off");

    form.innerHTML = `
      <textarea
        id="assistant-input"
        class="assistant-input"
        rows="4"
        placeholder="Ex.: qual release contém o PRT 12345?"
      ></textarea>
      <div class="assistant-toolbar">
        <div class="assistant-toolbar-meta">
          <span id="assistant-voice-status" class="assistant-voice-status">Digite ou fale sua pergunta</span>
        </div>
        <div class="assistant-actions">
          <button id="assistant-mic-btn" class="assistant-btn assistant-btn-voice" type="button">
            <i data-lucide="mic" data-assistant-mic-icon></i>
            <span data-assistant-mic-label>Falar por voz</span>
          </button>
          <button id="assistant-clear-btn" class="assistant-btn" type="button">
            <i data-lucide="eraser"></i>
            <span>Limpar conversa</span>
          </button>
          <button id="assistant-send-btn" class="assistant-btn assistant-btn-primary" type="submit">
            <i data-lucide="send"></i>
            <span>Perguntar</span>
          </button>
        </div>
      </div>
    `;

    composer.appendChild(form);
    panel.appendChild(messagesWrapper);
    panel.appendChild(composer);

    if (originalMessages) originalMessages.remove();
    if (originalForm) originalForm.remove();
    if (originalInput && originalInput !== originalForm) originalInput.remove();
    if (originalSendBtn && originalSendBtn !== originalForm) originalSendBtn.remove();
    if (originalClearBtn && originalClearBtn !== originalForm) originalClearBtn.remove();

    els.page.innerHTML = "";
    els.page.appendChild(hero);
    els.page.appendChild(panel);

    if (window.lucide) lucide.createIcons();
  }

  function hideSuggestionsSection() {
    els.suggestions.forEach(function (button) {
      button.classList.add("assistant-hidden-suggestions");

      const parent = button.closest("[class]") || button.parentElement;
      if (!parent) return;

      const promptButtons = parent.querySelectorAll("[data-assistant-prompt]");
      if (promptButtons.length > 0) {
        parent.classList.add("assistant-hidden-suggestions");
      }
    });
  }

  async function bootMotion() {
    try {
      const motionModule = await import("https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm");
      state.motion = motionModule;
      animateSections();
    } catch (_) {
      state.motion = null;
    }
  }

  function animateSections() {
    if (!state.motion || !els.page) return;

    const { animate, stagger } = state.motion;

    const hero = els.page.querySelector('[data-assistant-animate="hero"]');
    const panel = els.page.querySelector('[data-assistant-animate="panel"]');

    if (hero) {
      animate(
        hero,
        { opacity: [0, 1], y: [18, 0], filter: ["blur(8px)", "blur(0px)"] },
        { duration: 0.5, easing: [0.22, 1, 0.36, 1] }
      );

      const tags = hero.querySelectorAll(".assistant-hero-tag");
      if (tags.length) {
        animate(
          tags,
          { opacity: [0, 1], y: [10, 0] },
          { duration: 0.35, delay: stagger(0.05, { startDelay: 0.08 }), easing: [0.22, 1, 0.36, 1] }
        );
      }
    }

    if (panel) {
      animate(
        panel,
        { opacity: [0, 1], y: [22, 0], filter: ["blur(10px)", "blur(0px)"] },
        { duration: 0.56, delay: 0.08, easing: [0.22, 1, 0.36, 1] }
      );
    }
  }

  function animateMessageEntry() {
    if (!state.motion || !els.messages) return;

    const { animate } = state.motion;
    const items = Array.from(els.messages.querySelectorAll(".assistant-message"));
    if (!items.length) return;

    const target = items[items.length - 1];
    animate(
      target,
      { opacity: [0, 1], y: [12, 0], scale: [0.985, 1] },
      { duration: 0.34, easing: [0.22, 1, 0.36, 1] }
    );
  }

  function animateHover(element, scale, y) {
    if (!state.motion || !element) return;
    const { animate } = state.motion;
    animate(element, { scale, y }, { duration: 0.16, easing: "ease-out" });
  }

  function animateFocus(active) {
    if (!state.motion || !els.form) return;
    const { animate } = state.motion;
    animate(
      els.form,
      { scale: active ? 1.003 : 1, y: active ? -1 : 0 },
      { duration: 0.18, easing: "ease-out" }
    );
  }

  const api = {
    init,
    destroy,
    getState() {
      return state;
    },
  };

  window.initAssistentePage = init;
  window.destroyAssistentePage = destroy;
})();
