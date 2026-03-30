(function () {
  const STORAGE_KEY = "protocord_ia_assistant_v1";
  const FALLBACK_API_URL = "https://modelo-discord-server.vercel.app/api";
  const apiBaseUrl = (window.PROTOCORD_TRANSCRIBER_API || localStorage.getItem("PROTOCORD_TRANSCRIBER_API") || FALLBACK_API_URL).replace(/\/$/, "");

  const state = {
    messages: [],
    sending: false,
  };

  const els = {};

  function init() {
    bindElements();
    if (!els.page) return;
    restoreState();
    bindEvents();
    render();
  }

  function bindElements() {
    els.page = document.getElementById("pagina-assistente");
    els.messages = document.getElementById("assistant-messages");
    els.form = document.getElementById("assistant-form");
    els.input = document.getElementById("assistant-input");
    els.sendBtn = document.getElementById("assistant-send-btn");
    els.clearBtn = document.getElementById("assistant-clear-btn");
    els.suggestions = Array.from(document.querySelectorAll("[data-assistant-prompt]"));
  }

  function bindEvents() {
    els.form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitMessage();
    });

    els.clearBtn?.addEventListener("click", () => {
      state.messages = [];
      persist();
      render();
      notify("Conversa limpa.", "success");
    });

    els.suggestions.forEach((button) => {
      button.addEventListener("click", async () => {
        if (!els.input) return;
        els.input.value = button.dataset.assistantPrompt || "";
        await submitMessage();
      });
    });
  }

  function restoreState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.messages = Array.isArray(parsed.messages) ? parsed.messages.slice(-20) : [];
    } catch (error) {
      state.messages = [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: state.messages.slice(-20),
    }));
  }

  function render() {
    if (!els.messages) return;

    if (!state.messages.length) {
      els.messages.innerHTML = `
        <article class="assistant-message system">
          Pergunte sobre PRTs, releases, módulos, histórico operacional ou artigos da FAQ pública do Znuny. O assistente combina o contexto interno do ProtoCord com a base pública disponível.
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
    if (!message || state.sending) return;

    state.sending = true;
    toggleSending(true);
    state.messages.push({ role: "user", content: message });
    els.input.value = "";
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
          history: state.messages.slice(-8).map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: item.content,
          })),
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
      els.input.disabled = sending;
    }
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

  document.addEventListener("DOMContentLoaded", init);
})();
