(function () {
  const STORAGE_PREFIX = "protocord_embed_chat_";
  const EMBED_INSTANCES = {};
  const ZNUNY_ATTENDANT_PORTAL_URL = "https://rhede.serviceup.app/portal/index.html";

  function getApiBaseUrlSafe() {
    try {
      if (typeof window.getProtocordApiBaseUrl === "function") {
        return window.getProtocordApiBaseUrl();
      }
    } catch (_) {}
    return "";
  }

  function createEmbedInstance(containerId, pageContext) {
    if (EMBED_INSTANCES[containerId]) return EMBED_INSTANCES[containerId];

    const container = document.getElementById(containerId);
    if (!container) return null;

    const instance = {
      id: containerId,
      context: pageContext || "",
      messages: [],
      sending: false,
      collapsed: false,
      initialized: false,
    };

    instance.state = instance;

    const STORAGE_KEY = STORAGE_PREFIX + containerId;

    function loadState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        instance.messages = Array.isArray(parsed.messages) ?parsed.messages.slice(-10) : [];
        instance.collapsed = parsed.collapsed || false;
      } catch (_) {
        instance.messages = [];
      }
    }

    function saveState() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages: instance.messages.slice(-10),
          collapsed: instance.collapsed,
        })
      );
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

    function isZnunyAuthFailureMessage(value) {
      return /autentica..o autom..tica falhou/i.test(String(value || "")) && /znuny/i.test(String(value || ""));
    }

    function renderMessageContent(message) {
      const content = String(message?.content || "");
      const normalizedContent = isZnunyAuthFailureMessage(content)
        ?content.replace("/znuny/index.pl", "/portal/index.html")
        : content;
      const formatted = formatMessage(normalizedContent);

      if (message?.role !== "assistant" || !isZnunyAuthFailureMessage(content)) {
        return formatted;
      }

      return `
        <div>${formatted}</div>
        <div class="embed-chat-portal-help">
          <div class="embed-chat-portal-help-label">Suporte ao login</div>
          <div class="embed-chat-portal-help-copy">O acesso manual do atendente ocorre no portal <code>/portal/index.html</code>.</div>
          <button type="button" class="embed-chat-portal-link" data-embed-open-znuny-portal="true">Abrir portal do atendente</button>
        </div>
      `;
    }

    function getHistoryForRequest() {
      return instance.messages
        .slice(0, -1)
        .slice(-6)
        .filter(function (item) {
          return item && (item.role === "user" || item.role === "assistant") && item.content;
        })
        .map(function (item) {
          return { role: item.role, content: String(item.content) };
        });
    }

    function getContextHint() {
      return instance.context || "Contexto geral do ProtoCord";
    }

    function render() {
      const messagesContainer = container.querySelector(".embed-chat-messages");
      if (!messagesContainer) return;

      if (!instance.messages.length) {
        messagesContainer.innerHTML = `
          <div class="embed-chat-empty">
            <div class="embed-chat-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <p class="embed-chat-empty-title">Assistente Contextual</p>
            <p class="embed-chat-empty-subtitle">Pergunte sobre o conteúdo desta página.</p>
            <span class="embed-chat-context-badge">${escapeHtml(getContextHint())}</span>
          </div>
        `;
        messagesContainer.scrollTop = 0;
        return;
      }

      messagesContainer.innerHTML = instance.messages
        .map(function (message, index) {
          const label = message.role === "user" ?"Você" : "CordIA";
          const isUser = message.role === "user";

          return `
            <div class="embed-chat-message ${isUser ?"user" : "assistant"}">
              <div class="embed-chat-message-role">${label}</div>
              <div class="embed-chat-message-content">${renderMessageContent(message)}</div>
            </div>
          `;
        })
        .join("");

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function toggleCollapse() {
      instance.collapsed = !instance.collapsed;
      const panel = container.querySelector(".embed-chat-panel");
      const toggleIcon = container.querySelector(".embed-chat-toggle-icon");
      const messagesArea = container.querySelector(".embed-chat-messages-area");
      const composer = container.querySelector(".embed-chat-composer");

      if (!panel) return;

      panel.classList.toggle("is-collapsed", instance.collapsed);

      if (toggleIcon) {
        toggleIcon.innerHTML = instance.collapsed
          ?'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
      }

      saveState();
    }

    function clearMessages() {
      instance.messages = [];
      saveState();
      render();
    }

    async function submitMessage() {
      const input = container.querySelector(".embed-chat-input");
      const sendBtn = container.querySelector(".embed-chat-send-btn");
      const sendLabel = sendBtn?.querySelector("span");

      if (!input) return;

      const message = String(input.value || "").trim();
      if (!message || instance.sending) return;

      const apiBaseUrl = getApiBaseUrlSafe();
      if (!apiBaseUrl) {
        showToast?.("API base não configurada.", "error");
        return;
      }

      instance.sending = true;
      if (sendBtn) sendBtn.disabled = true;
      if (sendLabel) sendLabel.textContent = "Enviando...";

      instance.messages.push({ role: "user", content: message });
      input.value = "";
      input.style.height = "auto";
      render();
      saveState();

      try {
        const contextHint = getContextHint();
        const enrichedMessage = `[Contexto: ${contextHint}] ${message}`;

        const response = await fetch(`${apiBaseUrl}/assistente`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: enrichedMessage,
            history: getHistoryForRequest(),
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.sucesso) {
          throw new Error(data?.erro || `Falha ao consultar assistente. Status ${response.status}`);
        }

        instance.messages.push({
          role: "assistant",
          content: data.resposta || "Não encontrei uma resposta útil com o contexto disponível.",
        });

        saveState();
        render();
      } catch (error) {
        instance.messages.push({
          role: "assistant",
          content: error.message || "Falha ao consultar o assistente.",
        });

        saveState();
        render();
        showToast?.(error.message || "Falha ao consultar o assistente.", "error");
      } finally {
        instance.sending = false;
        if (sendBtn) sendBtn.disabled = false;
        if (sendLabel) sendLabel.textContent = "Enviar";
        input?.focus();
      }
    }

    function autoResizeTextarea() {
      const input = container.querySelector(".embed-chat-input");
      if (!input) return;
      input.style.height = "auto";
      input.style.height = Math.min(Math.max(44, input.scrollHeight), 120) + "px";
    }

    function injectStyles() {
      if (document.getElementById("embed-chat-styles")) return;

      const style = document.createElement("style");
      style.id = "embed-chat-styles";
      style.textContent = `
        .embed-chat-panel {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(59,130,246,0.12);
          background: linear-gradient(180deg, rgba(6,16,36,0.94), rgba(4,12,28,0.98));
          box-shadow: 0 12px 32px rgba(2,6,23,0.28), inset 0 1px 0 rgba(255,255,255,0.02);
          margin-top: 24px;
          transition: all 0.3s ease;
        }

        .embed-chat-panel.is-collapsed {
          max-height: 48px !important;
        }

        .embed-chat-panel.is-collapsed .embed-chat-messages-area,
        .embed-chat-panel.is-collapsed .embed-chat-composer {
          display: none !important;
        }

        .embed-chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(59,130,246,0.10);
          background: linear-gradient(180deg, rgba(8,18,37,0.6), rgba(5,14,29,0.8));
          cursor: pointer;
          user-select: none;
        }

        .embed-chat-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .embed-chat-header-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(59,130,246,0.12);
          color: #60a5fa;
        }

        .embed-chat-header-title {
          margin: 0;
          font-size: 0.92rem;
          font-weight: 700;
          color: rgba(245,250,255,0.96);
        }

        .embed-chat-header-subtitle {
          margin: 0;
          font-size: 0.75rem;
          color: rgba(184,204,234,0.7);
        }

        .embed-chat-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(59,130,246,0.14);
          background: rgba(255,255,255,0.04);
          color: rgba(231,239,255,0.7);
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .embed-chat-toggle-btn:hover {
          background: rgba(96,165,250,0.12);
          color: #60a5fa;
        }

        .embed-chat-messages-area {
          max-height: 320px;
          overflow-y: auto;
          padding: 16px;
        }

        .embed-chat-messages-area::-webkit-scrollbar {
          width: 6px;
        }

        .embed-chat-messages-area::-webkit-scrollbar-thumb {
          background: rgba(96,165,250,0.18);
          border-radius: 999px;
        }

        .embed-chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 28px 20px;
          min-height: 140px;
        }

        .embed-chat-empty-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          margin-bottom: 12px;
          color: #7ee7ff;
          background: rgba(20,42,82,0.48);
          border: 1px solid rgba(96,165,250,0.18);
        }

        .embed-chat-empty-title {
          margin: 0 0 6px;
          color: rgba(245,250,255,0.96);
          font-size: 0.95rem;
          font-weight: 700;
        }

        .embed-chat-empty-subtitle {
          margin: 0;
          color: rgba(182,203,234,0.7);
          font-size: 0.82rem;
        }

        .embed-chat-context-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(59,130,246,0.18);
          background: rgba(17,34,68,0.48);
          color: rgba(226,236,255,0.8);
          font-size: 0.72rem;
          font-weight: 600;
          margin-top: 12px;
          backdrop-filter: blur(8px);
        }

        .embed-chat-message {
          margin-bottom: 12px;
          animation: embedFadeIn 0.25s ease;
        }

        @keyframes embedFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .embed-chat-message.user {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .embed-chat-message.assistant {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .embed-chat-message-role {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(121,189,255,0.7);
          margin-bottom: 4px;
        }

        .embed-chat-message.user .embed-chat-message-role {
          color: #73e3ff;
        }

        .embed-chat-message-content {
          max-width: 92%;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 0.85rem;
          line-height: 1.6;
          word-break: break-word;
        }

        .embed-chat-message.user .embed-chat-message-content {
          border: 1px solid rgba(34,211,238,0.16);
          background: linear-gradient(135deg, rgba(30,64,175,0.34), rgba(37,99,235,0.22));
          color: rgba(235,242,255,0.95);
        }

        .embed-chat-message.assistant .embed-chat-message-content {
          border: 1px solid rgba(59,130,246,0.14);
          background: linear-gradient(180deg, rgba(13,27,54,0.88), rgba(8,18,38,0.94));
          color: rgba(235,242,255,0.92);
        }

        .embed-chat-portal-help {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(96,165,250,0.16);
          background: rgba(8,18,37,0.74);
        }

        .embed-chat-portal-help-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7ee7ff;
        }

        .embed-chat-portal-help-copy {
          margin-top: 6px;
          color: rgba(225,235,250,0.82);
          font-size: 0.8rem;
          line-height: 1.55;
        }

        .embed-chat-portal-link {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid rgba(34,211,238,0.18);
          background: linear-gradient(135deg, rgba(8,145,178,0.26), rgba(37,99,235,0.24));
          color: rgba(244,249,255,0.96);
          font-size: 0.78rem;
          font-weight: 700;
          padding: 9px 12px;
          cursor: pointer;
        }

        .embed-chat-composer {
          padding: 14px 16px;
          border-top: 1px solid rgba(59,130,246,0.10);
          background: linear-gradient(180deg, rgba(8,18,37,0.45), rgba(5,14,29,0.72));
        }

        .embed-chat-form {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }

        .embed-chat-input {
          flex: 1;
          min-height: 44px;
          max-height: 120px;
          resize: none;
          border: 1px solid rgba(59,130,246,0.12);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(6,16,33,0.98), rgba(6,15,30,0.96));
          color: rgba(240,247,255,0.96);
          padding: 12px 14px;
          font-size: 0.85rem;
          line-height: 1.6;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .embed-chat-input::placeholder {
          color: rgba(162,186,224,0.48);
        }

        .embed-chat-input:focus {
          border-color: rgba(96,165,250,0.26);
          box-shadow: 0 0 0 3px rgba(96,165,250,0.1);
        }

        .embed-chat-send-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 14px;
          border: 1px solid rgba(34,211,238,0.14);
          background: linear-gradient(135deg, rgba(56,189,248,0.94), rgba(59,130,246,0.88));
          color: #061423;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }

        .embed-chat-send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(37,99,235,0.24), 0 0 20px rgba(34,211,238,0.12);
        }

        .embed-chat-send-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .embed-chat-clear-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(59,130,246,0.14);
          background: rgba(12,26,51,0.72);
          color: rgba(231,239,255,0.7);
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .embed-chat-clear-btn:hover {
          background: rgba(239,68,68,0.12);
          color: #fca5a5;
          border-color: rgba(239,68,68,0.2);
        }

        @media (max-width: 768px) {
          .embed-chat-messages-area {
            max-height: 240px;
          }

          .embed-chat-header {
            padding: 12px 14px;
          }

          .embed-chat-composer {
            padding: 12px;
          }
        }
      `;

      document.head.appendChild(style);
    }

    function renderShell() {
      injectStyles();

      container.innerHTML = `
        <div class="embed-chat-panel ${instance.collapsed ?"is-collapsed" : ""}">
          <div class="embed-chat-header" data-embed-toggle>
            <div class="embed-chat-header-left">
              <div class="embed-chat-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <div>
                <p class="embed-chat-header-title">CordIA Rápido</p>
                <p class="embed-chat-header-subtitle">Assistente contextual</p>
              </div>
            </div>
            <button type="button" class="embed-chat-toggle-btn" data-embed-toggle>
              <span class="embed-chat-toggle-icon">
                ${instance.collapsed
                  ?'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
                  : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>'}
              </span>
            </button>
          </div>

          <div class="embed-chat-messages-area">
            <div class="embed-chat-messages"></div>
          </div>

          <div class="embed-chat-composer">
            <form class="embed-chat-form" data-embed-form>
              <textarea
                class="embed-chat-input"
                rows="1"
                placeholder="Pergunte sobre esta página..."
              ></textarea>
              <button type="button" class="embed-chat-clear-btn" data-embed-clear title="Limpar conversa">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
              <button type="submit" class="embed-chat-send-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </div>
      `;

      container.querySelector("[data-embed-toggle]")?.addEventListener("click", toggleCollapse);
      container.querySelector("[data-embed-clear]")?.addEventListener("click", clearMessages);

      const form = container.querySelector("[data-embed-form]");
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        submitMessage();
      });

      const input = container.querySelector(".embed-chat-input");
      input?.addEventListener("input", autoResizeTextarea);
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submitMessage();
        }
      });

      container.addEventListener("click", (event) => {
        const trigger = event.target instanceof Element
          ?event.target.closest("[data-embed-open-znuny-portal='true']")
          : null;
        if (!trigger) return;

        event.preventDefault();
        window.open(ZNUNY_ATTENDANT_PORTAL_URL, "_blank", "noopener,noreferrer");
      });

      loadState();
      render();
      instance.initialized = true;
    }

    renderShell();

    EMBED_INSTANCES[containerId] = instance;
    return instance;
  }

  window.initEmbeddedChat = createEmbedInstance;
})();
