(function () {
  "use strict";

  const PLUGIN_ID = "znuny-transport";
  const PAYLOAD_KEY = "protocord_znuny_transport_payload_v1";
  const BASE_URL_KEY = "PROTOCORD_ZNUNY_BASE_URL";
  const TICKET_URL_KEY = "PROTOCORD_ZNUNY_TICKET_URL";

  const state = {
    payload: null,
    appOpen: false,
  };

  const plugin = {
    id: PLUGIN_ID,
    name: "Transporte Znuny",
    version: "1.0.0",
    init,
    handleTransport,
    openApp,
    getPayload,
    getTicketUrl,
  };

  window.ProtoCordPlugins = window.ProtoCordPlugins || {};
  window.ProtoCordPlugins[PLUGIN_ID] = plugin;
  window.ProtoCordZnunyTransport = plugin;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  function init() {
    injectStyles();
    renderLauncher();
    restorePayload();

    window.addEventListener("protocord:znuny-transport", (event) => {
      handleTransport(event.detail?.payload);
    });
  }

  function handleTransport(payload) {
    const normalized = normalizePayload(payload);
    if (!normalized) {
      notify("Nao foi possivel preparar o transporte.", "error");
      return false;
    }

    state.payload = normalized;
    persistPayload(normalized);
    renderApp();

    const ticketUrl = getTicketUrl();
    if (!ticketUrl) {
      openApp();
      notify("Configure a URL do Znuny no plugin.", "warning");
      return true;
    }

    const opened = window.open(ticketUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      openApp();
      notify("Pop-up bloqueado. Abra pelo plugin Znuny.", "warning");
      return true;
    }

    notify("Transporte enviado para o Znuny.", "success");
    return true;
  }

  function getTicketUrl() {
    const explicit = String(
      window.PROTOCORD_RUNTIME_CONFIG?.ZNUNY_TICKET_URL ||
      localStorage.getItem(TICKET_URL_KEY) ||
      ""
    ).trim();

    if (explicit) return explicit;

    const baseUrl = String(
      window.PROTOCORD_RUNTIME_CONFIG?.ZNUNY_BASE_URL ||
      localStorage.getItem(BASE_URL_KEY) ||
      ""
    ).trim();

    if (!baseUrl) return "";

    try {
      return new URL("/znuny/index.pl?Action=AgentTicketPhone", baseUrl).toString();
    } catch (error) {
      return "";
    }
  }

  function getPayload() {
    return state.payload || restorePayload();
  }

  function persistPayload(payload) {
    const envelope = {
      payload,
      savedAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    localStorage.setItem(PAYLOAD_KEY, JSON.stringify(envelope));
    window.PROTOCORD_LAST_ZNUNY_TRANSPORT_PAYLOAD = payload;
    window.PROTOCORD_ZNUNY_TRANSPORT_STORAGE_KEY = PAYLOAD_KEY;
  }

  function restorePayload() {
    try {
      const raw = localStorage.getItem(PAYLOAD_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.payload || Number(parsed.expiresAt || 0) < Date.now()) return null;
      state.payload = normalizePayload(parsed.payload);
      return state.payload;
    } catch (error) {
      return null;
    }
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    return {
      source: "protocord",
      version: 1,
      createdAt: payload.createdAt || new Date().toISOString(),
      contato: String(payload.contato || ""),
      telefone: String(payload.telefone || ""),
      assunto: String(payload.assunto || payload.titulo || "Solicitacao de Suporte"),
      titulo: String(payload.titulo || payload.assunto || "Solicitacao de Suporte"),
      problema: String(payload.problema || ""),
      solucao: String(payload.solucao || ""),
      relatorio: String(payload.relatorio || ""),
      relatorioTexto: String(payload.relatorioTexto || stripHtml(payload.relatorio || "")),
    };
  }

  function renderLauncher() {
    if (document.getElementById("protocord-znuny-plugin-launcher")) return;

    const launcher = document.createElement("button");
    launcher.id = "protocord-znuny-plugin-launcher";
    launcher.type = "button";
    launcher.innerHTML = `
      <span class="znuny-plugin-dot"></span>
      <span>Znuny</span>
    `;
    launcher.addEventListener("click", openApp);
    document.body.appendChild(launcher);
  }

  function openApp() {
    state.appOpen = true;
    renderApp();
  }

  function closeApp() {
    state.appOpen = false;
    const app = document.getElementById("protocord-znuny-plugin-app");
    app?.remove();
  }

  function renderApp() {
    if (!state.appOpen) return;

    let app = document.getElementById("protocord-znuny-plugin-app");
    if (!app) {
      app = document.createElement("div");
      app.id = "protocord-znuny-plugin-app";
      app.innerHTML = `
        <div class="znuny-plugin-backdrop" data-znuny-close="true"></div>
        <section class="znuny-plugin-shell" role="dialog" aria-modal="true" aria-label="Plugin de transporte Znuny">
          <header class="znuny-plugin-header">
            <div>
              <span class="znuny-plugin-eyebrow">Plugin ProtoCord</span>
              <h2>Transporte Znuny</h2>
            </div>
            <button type="button" class="znuny-plugin-icon" data-znuny-close="true" aria-label="Fechar">x</button>
          </header>
          <div class="znuny-plugin-grid">
            <label>
              <span>Portal Znuny</span>
              <input id="znuny-plugin-base-url" type="url" placeholder="https://seu-portal.example.com" />
            </label>
            <label>
              <span>URL de novo ticket</span>
              <input id="znuny-plugin-ticket-url" type="url" placeholder="https://.../znuny/index.pl?Action=AgentTicketPhone" />
            </label>
          </div>
          <div class="znuny-plugin-preview">
            <div>
              <span>Assunto</span>
              <strong id="znuny-plugin-subject">Nenhum transporte preparado</strong>
            </div>
            <div>
              <span>Contato</span>
              <strong id="znuny-plugin-contact">--</strong>
            </div>
          </div>
          <textarea id="znuny-plugin-report" readonly></textarea>
          <footer class="znuny-plugin-actions">
            <button type="button" class="znuny-plugin-secondary" data-znuny-copy="true">Copiar relatorio</button>
            <button type="button" class="znuny-plugin-secondary" data-znuny-save="true">Salvar config</button>
            <button type="button" class="znuny-plugin-primary" data-znuny-open="true">Abrir novo ticket</button>
          </footer>
        </section>
      `;
      document.body.appendChild(app);
      bindApp(app);
    }

    app.querySelector("#znuny-plugin-base-url").value = localStorage.getItem(BASE_URL_KEY) || "";
    app.querySelector("#znuny-plugin-ticket-url").value = localStorage.getItem(TICKET_URL_KEY) || "";

    const payload = getPayload();
    app.querySelector("#znuny-plugin-subject").textContent = payload?.assunto || "Nenhum transporte preparado";
    app.querySelector("#znuny-plugin-contact").textContent = payload?.contato || "--";
    app.querySelector("#znuny-plugin-report").value = payload?.relatorioTexto || "";
  }

  function bindApp(app) {
    app.addEventListener("click", async (event) => {
      if (event.target?.closest?.("[data-znuny-close]")) {
        closeApp();
        return;
      }

      if (event.target?.closest?.("[data-znuny-save]")) {
        saveConfig(app);
        notify("Configuracao do plugin salva.", "success");
        renderApp();
        return;
      }

      if (event.target?.closest?.("[data-znuny-open]")) {
        saveConfig(app);
        const url = getTicketUrl();
        if (!url) {
          notify("Informe a URL do Znuny para abrir o ticket.", "warning");
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      if (event.target?.closest?.("[data-znuny-copy]")) {
        const payload = getPayload();
        if (!payload) {
          notify("Nenhum relatorio preparado.", "warning");
          return;
        }
        await navigator.clipboard.writeText(payload.relatorioTexto || payload.relatorio || "");
        notify("Relatorio copiado.", "success");
      }
    });
  }

  function saveConfig(root) {
    const baseUrl = root.querySelector("#znuny-plugin-base-url")?.value?.trim() || "";
    const ticketUrl = root.querySelector("#znuny-plugin-ticket-url")?.value?.trim() || "";

    if (baseUrl) localStorage.setItem(BASE_URL_KEY, baseUrl);
    else localStorage.removeItem(BASE_URL_KEY);

    if (ticketUrl) localStorage.setItem(TICKET_URL_KEY, ticketUrl);
    else localStorage.removeItem(TICKET_URL_KEY);
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = String(html || "").replace(/<br\s*\/?>/gi, "\n");
    return String(div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function notify(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type || "info");
    }
  }

  function injectStyles() {
    if (document.getElementById("protocord-znuny-plugin-style")) return;

    const style = document.createElement("style");
    style.id = "protocord-znuny-plugin-style";
    style.textContent = `
      #protocord-znuny-plugin-launcher {
        position: fixed;
        left: 18px;
        bottom: 18px;
        z-index: 70;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        border: 1px solid rgba(40, 198, 229, .32);
        border-radius: 999px;
        background: rgba(8, 17, 34, .92);
        color: #e8eefc;
        box-shadow: 0 18px 45px rgba(0, 0, 0, .28);
        padding: 10px 14px;
        font: 800 13px/1 Inter, Arial, sans-serif;
        cursor: pointer;
      }

      .znuny-plugin-dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #28c6e5;
        box-shadow: 0 0 0 5px rgba(40, 198, 229, .14);
      }

      #protocord-znuny-plugin-app {
        position: fixed;
        inset: 0;
        z-index: 120;
      }

      .znuny-plugin-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(3, 8, 18, .72);
        backdrop-filter: blur(8px);
      }

      .znuny-plugin-shell {
        position: absolute;
        right: 26px;
        bottom: 26px;
        width: min(560px, calc(100vw - 32px));
        max-height: calc(100vh - 52px);
        overflow: auto;
        border: 1px solid rgba(63, 104, 166, .42);
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(9, 20, 39, .98), rgba(5, 12, 26, .98));
        box-shadow: 0 28px 80px rgba(0, 0, 0, .42);
        color: #e8eefc;
        padding: 20px;
        font-family: Inter, Arial, sans-serif;
      }

      .znuny-plugin-header,
      .znuny-plugin-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .znuny-plugin-eyebrow,
      .znuny-plugin-preview span,
      .znuny-plugin-grid span {
        display: block;
        color: #8fa4c7;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .znuny-plugin-header h2 {
        margin: 5px 0 0;
        color: #fff;
        font-size: 24px;
        line-height: 1.1;
      }

      .znuny-plugin-icon,
      .znuny-plugin-secondary,
      .znuny-plugin-primary {
        border: 1px solid rgba(63, 104, 166, .42);
        border-radius: 12px;
        background: rgba(6, 14, 28, .78);
        color: #e8eefc;
        cursor: pointer;
        font-weight: 800;
      }

      .znuny-plugin-icon {
        width: 36px;
        height: 36px;
      }

      .znuny-plugin-grid {
        display: grid;
        gap: 12px;
        margin-top: 18px;
      }

      .znuny-plugin-grid input,
      #znuny-plugin-report {
        width: 100%;
        margin-top: 7px;
        border: 1px solid rgba(63, 104, 166, .42);
        border-radius: 12px;
        background: rgba(3, 8, 18, .54);
        color: #e8eefc;
        outline: none;
        padding: 12px;
      }

      .znuny-plugin-preview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 14px;
      }

      .znuny-plugin-preview > div {
        border: 1px solid rgba(63, 104, 166, .34);
        border-radius: 14px;
        background: rgba(6, 14, 28, .58);
        padding: 12px;
      }

      .znuny-plugin-preview strong {
        display: block;
        margin-top: 6px;
        color: #fff;
        font-size: 13px;
        line-height: 1.35;
      }

      #znuny-plugin-report {
        height: 170px;
        resize: vertical;
        margin-top: 14px;
        line-height: 1.45;
      }

      .znuny-plugin-actions {
        flex-wrap: wrap;
        margin-top: 14px;
      }

      .znuny-plugin-secondary,
      .znuny-plugin-primary {
        padding: 11px 14px;
      }

      .znuny-plugin-primary {
        border-color: rgba(40, 198, 229, .55);
        background: linear-gradient(135deg, #28c6e5, #16b7d8);
        color: #06111f;
      }

      @media (max-width: 680px) {
        .znuny-plugin-shell {
          left: 16px;
          right: 16px;
          bottom: 16px;
        }

        .znuny-plugin-preview {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }
})();
