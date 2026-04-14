(function () {
  const STORAGE_KEY = "protocord_ia_assistant_v1";
  const WIDGET_STORAGE_KEY = "protocord_ia_widget_v1";

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
    widgetOpen: false,
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

    if (_voiceTimerInterval) {
      clearInterval(_voiceTimerInterval);
      _voiceTimerInterval = null;
    }

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

  let _voiceTimerInterval = null;

  function syncVoiceUi() {
    if (_voiceTimerInterval) {
      clearInterval(_voiceTimerInterval);
      _voiceTimerInterval = null;
    }

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
          updateRecordingTimer(label);
          _voiceTimerInterval = setInterval(() => updateRecordingTimer(label), 1000);
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

  function updateRecordingTimer(label) {
    if (!label || !state.mediaRecorder?._startTime) return;
    const totalSeconds = Math.floor((Date.now() - state.mediaRecorder._startTime) / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    label.textContent = `Parar (${minutes}:${seconds})`;
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
      state.mediaRecorder._startTime = Date.now();
      state.recording = true;
      syncVoiceUi();
      notify("Gravação iniciada.", "info");
    } catch (error) {
      notify("Não foi possível acessar o microfone.", "error");
    }
  }

  function stopVoiceCapture(silent) {
    if (_voiceTimerInterval) {
      clearInterval(_voiceTimerInterval);
      _voiceTimerInterval = null;
    }

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

    const audioSizeKB = (blob.size / 1024).toFixed(1);
    const audioDuration = state.mediaRecorder?._startTime 
      ? Math.floor((Date.now() - state.mediaRecorder._startTime) / 1000) 
      : 0;
    const durationStr = audioDuration > 0 
      ? `${Math.floor(audioDuration / 60)}min ${audioDuration % 60}s` 
      : "instantâneo";

    notify(`Enviando áudio (${audioSizeKB} KB, ${durationStr})...`, "info");

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
      "/api/transcricao-direta",
      "/transcricao-direta",
      "/api/transcrever",
      "/transcrever",
      "/api/transcribe",
      "/transcribe",
    ];

    const candidateFieldNames = ["audio", "file", "media", "sound"];

    let lastError = null;

    for (const path of candidatePaths) {
      for (const fieldName of candidateFieldNames) {
        try {
          const formData = new FormData();
          const extension = resolveAudioExtension(blob.type);
          const filename = `assistente-voz-${Date.now()}.${extension}`;
          
          formData.append(fieldName, blob, filename);
          formData.append("source", "assistant-mic");
          formData.append("timestamp", new Date().toISOString());

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
            data?.text ||
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

      /* ============ WIDGET FLUTUANTE ============ */

      #cordia-widget {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        pointer-events: none;
      }

      #cordia-widget * {
        pointer-events: auto;
      }

      .cordia-widget-toggle {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px 16px;
        border-radius: 16px;
        border: 1px solid rgba(59, 130, 246, 0.2);
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
        color: rgba(231, 239, 255, 0.94);
        box-shadow: 0 8px 24px rgba(2, 6, 23, 0.32), 0 0 28px rgba(59, 130, 246, 0.08);
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      .cordia-widget-toggle:hover {
        transform: translateY(-2px);
        border-color: rgba(96, 165, 250, 0.3);
        box-shadow: 0 12px 32px rgba(2, 6, 23, 0.36), 0 0 36px rgba(59, 130, 246, 0.14);
      }

      .cordia-widget-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(56, 189, 248, 0.88), rgba(59, 130, 246, 0.82));
        color: #061423;
      }

      .cordia-widget-icon svg {
        width: 20px;
        height: 20px;
      }

      .cordia-widget-label {
        font-size: 11px;
        font-weight: 700;
        color: rgba(231, 239, 255, 0.88);
      }

      .cordia-widget-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 48px;
        height: 18px;
        padding: 0 8px;
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.92), rgba(22, 163, 74, 0.88));
        color: #ffffff;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.28);
      }

      .cordia-widget-panel {
        position: absolute;
        bottom: calc(100% + 12px);
        right: 0;
        width: 420px;
        max-width: calc(100vw - 48px);
        height: 600px;
        max-height: calc(100vh - 140px);
        border-radius: 20px;
        border: 1px solid rgba(59, 130, 246, 0.14);
        background: linear-gradient(180deg, rgba(8, 19, 42, 0.97), rgba(5, 14, 32, 0.99));
        box-shadow: 0 20px 48px rgba(2, 6, 23, 0.42), 0 0 0 1px rgba(59, 130, 246, 0.06);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(12px) scale(0.96);
        pointer-events: none;
        transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      .cordia-widget-panel.cordia-widget-panel-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .cordia-widget-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid rgba(59, 130, 246, 0.10);
        background: linear-gradient(180deg, rgba(10, 22, 46, 0.96), rgba(8, 18, 38, 0.94));
        flex-shrink: 0;
      }

      .cordia-widget-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 700;
        color: rgba(245, 250, 255, 0.96);
      }

      .cordia-widget-panel-icon {
        width: 22px;
        height: 22px;
        color: #60a5fa;
      }

      .cordia-widget-close {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        border: 1px solid rgba(59, 130, 246, 0.14);
        background: rgba(255, 255, 255, 0.04);
        color: rgba(231, 239, 255, 0.7);
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .cordia-widget-close:hover {
        background: rgba(239, 68, 68, 0.12);
        color: #fca5a5;
        border-color: rgba(239, 68, 68, 0.2);
      }

      .cordia-widget-close svg {
        width: 16px;
        height: 16px;
      }

      .cordia-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .cordia-widget-messages::-webkit-scrollbar {
        width: 8px;
      }

      .cordia-widget-messages::-webkit-scrollbar-thumb {
        background: rgba(96, 165, 250, 0.18);
        border-radius: 999px;
      }

      .cordia-widget-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        flex: 1;
        padding: 32px 24px;
      }

      .cordia-widget-empty-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        margin-bottom: 12px;
        color: #7ee7ff;
        background: rgba(20, 42, 82, 0.48);
        border: 1px solid rgba(96, 165, 250, 0.18);
      }

      .cordia-widget-empty-icon svg {
        width: 24px;
        height: 24px;
      }

      .cordia-widget-empty-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 80px;
        height: 28px;
        margin-bottom: 10px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(96, 165, 250, 0.18);
        background: rgba(20, 42, 82, 0.44);
        color: #64deff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .cordia-widget-empty h4 {
        margin: 0 0 8px;
        color: rgba(245, 250, 255, 0.96);
        font-size: 18px;
        font-weight: 700;
      }

      .cordia-widget-empty p {
        margin: 0;
        color: rgba(182, 203, 234, 0.78);
        font-size: 13px;
        line-height: 1.6;
      }

      .cordia-widget-message {
        display: flex;
        flex-direction: column;
        animation: widgetFadeIn 0.25s ease;
      }

      @keyframes widgetFadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .cordia-widget-message.user {
        align-items: flex-end;
      }

      .cordia-widget-message.assistant {
        align-items: flex-start;
      }

      .cordia-widget-message-role {
        margin-bottom: 6px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(121, 189, 255, 0.7);
      }

      .cordia-widget-message.user .cordia-widget-message-role {
        color: #73e3ff;
      }

      .cordia-widget-message-content {
        max-width: 88%;
        border-radius: 16px;
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.65;
        word-break: break-word;
      }

      .cordia-widget-message.user .cordia-widget-message-content {
        border: 1px solid rgba(34, 211, 238, 0.16);
        background: linear-gradient(135deg, rgba(30, 64, 175, 0.34), rgba(37, 99, 235, 0.22));
        color: rgba(235, 242, 255, 0.95);
      }

      .cordia-widget-message.assistant .cordia-widget-message-content {
        border: 1px solid rgba(59, 130, 246, 0.14);
        background: linear-gradient(180deg, rgba(13, 27, 54, 0.88), rgba(8, 18, 38, 0.94));
        color: rgba(235, 242, 255, 0.92);
      }

      .cordia-widget-composer {
        padding: 16px 18px 18px;
        border-top: 1px solid rgba(59, 130, 246, 0.10);
        background: linear-gradient(180deg, rgba(8, 18, 37, 0.45), rgba(5, 14, 29, 0.72));
        flex-shrink: 0;
      }

      .cordia-widget-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .cordia-widget-input {
        width: 100%;
        min-height: 60px;
        max-height: 140px;
        resize: none;
        border: 1px solid rgba(59, 130, 246, 0.12);
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(6, 16, 33, 0.98), rgba(6, 15, 30, 0.96));
        color: rgba(240, 247, 255, 0.96);
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.6;
        outline: none;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .cordia-widget-input::placeholder {
        color: rgba(162, 186, 224, 0.48);
      }

      .cordia-widget-input:focus {
        border-color: rgba(96, 165, 250, 0.26);
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
      }

      .cordia-widget-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .cordia-widget-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.12);
        background: rgba(12, 26, 51, 0.52);
        font-size: 11px;
        color: rgba(156, 183, 224, 0.72);
      }

      .cordia-widget-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .cordia-widget-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 12px;
        border: 1px solid rgba(59, 130, 246, 0.14);
        background: rgba(12, 26, 51, 0.72);
        color: rgba(231, 239, 255, 0.94);
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .cordia-widget-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: rgba(96, 165, 250, 0.24);
        box-shadow: 0 0 16px rgba(59, 130, 246, 0.10);
      }

      .cordia-widget-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .cordia-widget-btn svg {
        width: 15px;
        height: 15px;
      }

      .cordia-widget-btn-primary {
        border-color: rgba(34, 211, 238, 0.14);
        background: linear-gradient(135deg, rgba(56, 189, 248, 0.94), rgba(59, 130, 246, 0.88));
        color: #061423;
        box-shadow: 0 8px 20px rgba(37, 99, 235, 0.22), 0 0 20px rgba(34, 211, 238, 0.12);
      }

      .cordia-widget-btn-primary:hover:not(:disabled) {
        box-shadow: 0 10px 22px rgba(37, 99, 235, 0.24), 0 0 26px rgba(34, 211, 238, 0.16);
      }

      @media (max-width: 768px) {
        #cordia-widget {
          bottom: 16px;
          right: 16px;
        }

        .cordia-widget-panel {
          width: calc(100vw - 32px);
          height: calc(100vh - 120px);
          max-height: calc(100vh - 120px);
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

  // ============ WIDGET FLUTUANTE ============

  function initFloatingWidget() {
    if (document.getElementById("cordia-widget")) return;

    const widgetContainer = document.createElement("div");
    widgetContainer.id = "cordia-widget";
    widgetContainer.innerHTML = `
      <button id="cordia-widget-toggle" class="cordia-widget-toggle" type="button" aria-label="Abrir assistente CordIA">
        <div class="cordia-widget-icon">
          <i data-lucide="bot" class="cordia-widget-icon-svg"></i>
        </div>
        <span class="cordia-widget-label">CordIA</span>
        <div class="cordia-widget-badge">Online</div>
      </button>
      <div id="cordia-widget-panel" class="cordia-widget-panel">
        <div class="cordia-widget-panel-header">
          <div class="cordia-widget-panel-title">
            <i data-lucide="bot" class="cordia-widget-panel-icon"></i>
            <span>CordIA - Assistente</span>
          </div>
          <button type="button" id="cordia-widget-close" class="cordia-widget-close" aria-label="Fechar">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div id="cordia-widget-messages" class="cordia-widget-messages"></div>
        <div class="cordia-widget-composer">
          <form id="cordia-widget-form" class="cordia-widget-form" autocomplete="off">
            <textarea
              id="cordia-widget-input"
              class="cordia-widget-input"
              rows="3"
              placeholder="Ex.: qual release contém o PRT 12345?"
            ></textarea>
            <div class="cordia-widget-toolbar">
              <span id="cordia-widget-status" class="cordia-widget-status">Digite sua pergunta</span>
              <div class="cordia-widget-actions">
                <button type="button" id="cordia-widget-clear" class="cordia-widget-btn" title="Limpar">
                  <i data-lucide="eraser"></i>
                </button>
                <button type="submit" id="cordia-widget-send" class="cordia-widget-btn cordia-widget-btn-primary">
                  <i data-lucide="send"></i>
                  <span>Perguntar</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(widgetContainer);

    const toggleBtn = document.getElementById("cordia-widget-toggle");
    const closeBtn = document.getElementById("cordia-widget-close");
    const panel = document.getElementById("cordia-widget-panel");
    const form = document.getElementById("cordia-widget-form");
    const input = document.getElementById("cordia-widget-input");
    const sendBtn = document.getElementById("cordia-widget-send");
    const clearBtn = document.getElementById("cordia-widget-clear");

    restoreWidgetState();

    toggleBtn?.addEventListener("click", () => {
      state.widgetOpen = !state.widgetOpen;
      panel.classList.toggle("cordia-widget-panel-open", state.widgetOpen);
      persistWidgetState();

      if (state.widgetOpen && !panel.dataset.initialized) {
        initWidgetChat();
        panel.dataset.initialized = "true";
      }

      if (window.lucide) lucide.createIcons();
    });

    closeBtn?.addEventListener("click", () => {
      state.widgetOpen = false;
      panel.classList.remove("cordia-widget-panel-open");
      persistWidgetState();
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitWidgetMessage();
    });

    clearBtn?.addEventListener("click", () => {
      state.messages = [];
      persist();
      renderWidgetMessages();
    });

    input?.addEventListener("input", () => {
      autoResizeWidgetInput();
    });

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitWidgetMessage();
      }
    });

    if (window.lucide) lucide.createIcons();
  }

  function restoreWidgetState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WIDGET_STORAGE_KEY) || "{}");
      state.widgetOpen = parsed.open || false;
    } catch (_) {
      state.widgetOpen = false;
    }
  }

  function persistWidgetState() {
    localStorage.setItem(
      WIDGET_STORAGE_KEY,
      JSON.stringify({
        open: state.widgetOpen,
      })
    );
  }

  function initWidgetChat() {
    restoreState();
    renderWidgetMessages();
  }

  function renderWidgetMessages() {
    const messagesContainer = document.getElementById("cordia-widget-messages");
    if (!messagesContainer) return;

    if (!state.messages.length) {
      messagesContainer.innerHTML = `
        <div class="cordia-widget-empty">
          <div class="cordia-widget-empty-icon">
            <i data-lucide="sparkles"></i>
          </div>
          <div class="cordia-widget-empty-badge">CORDIA</div>
          <h4>Assistente Operacional</h4>
          <p>Consulte PRTs, releases e módulos.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    messagesContainer.innerHTML = state.messages
      .map(function (message, index) {
        const label = message.role === "user" ? "Você" : "CordIA";

        return `
          <div class="cordia-widget-message ${message.role}">
            <div class="cordia-widget-message-role">${label}</div>
            <div class="cordia-widget-message-content">${formatMessage(message.content)}</div>
          </div>
        `;
      })
      .join("");

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }

  async function submitWidgetMessage() {
    const input = document.getElementById("cordia-widget-input");
    const sendBtn = document.getElementById("cordia-widget-send");
    const sendLabel = sendBtn?.querySelector("span");

    const message = String(input?.value || "").trim();
    if (!message || state.sending) return;

    const apiBaseUrl = getApiBaseUrlSafe();
    if (!apiBaseUrl) {
      notify("API base não configurada.", "error");
      return;
    }

    state.sending = true;
    if (sendBtn) sendBtn.disabled = true;
    if (sendLabel) sendLabel.textContent = "Consultando...";

    state.messages.push({ role: "user", content: message });
    input.value = "";
    input.style.height = "auto";
    renderWidgetMessages();
    persist();

    try {
      const response = await fetch(`${apiBaseUrl}/assistente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        content: data.resposta || "Não encontrei uma resposta útil.",
      });

      persist();
      renderWidgetMessages();
    } catch (error) {
      state.messages.push({
        role: "assistant",
        content: error.message || "Falha ao consultar o assistente.",
      });

      persist();
      renderWidgetMessages();
      notify(error.message || "Falha ao consultar o assistente.", "error");
    } finally {
      state.sending = false;
      if (sendBtn) sendBtn.disabled = false;
      if (sendLabel) sendLabel.textContent = "Perguntar";
      input?.focus();
    }
  }

  function autoResizeWidgetInput() {
    const input = document.getElementById("cordia-widget-input");
    if (!input) return;
    input.style.height = "auto";
    input.style.height = Math.min(Math.max(60, input.scrollHeight), 140) + "px";
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

  // Inicializa o widget flutuante automaticamente
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFloatingWidget);
  } else {
    initFloatingWidget();
  }
})();
