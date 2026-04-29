(function () {
  "use strict";

  const PLUGIN_ID = "znuny-transport";
  const PAYLOAD_KEY = "protocord_znuny_transport_payload_v1";
  const AUTO_PAYLOAD_KEY = "znuny_auto_payload";
  const BASE_URL_KEY = "PROTOCORD_ZNUNY_BASE_URL";
  const TICKET_URL_KEY = "PROTOCORD_ZNUNY_TICKET_URL";
  const DEFAULT_ZNUNY_HOST = ["rhede", "serviceup", "app"].join(".");
  const DEFAULT_ZNUNY_TICKET_URL = `https://${DEFAULT_ZNUNY_HOST}/znuny/index.pl?Action=AgentTicketPhone`;
  const EXTENSION_RELEASE_URL = "plugins/releases/protocord-znuny-extension-v1.0.0.zip";

  const state = {
    payload: null,
    appOpen: false,
    installStep: 1,
  };

  const plugin = {
    id: PLUGIN_ID,
    name: "Transporte Znuny",
    version: "1.0.0",
    init,
    handleTransport,
    openApp,
    renderLauncher,
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

  // Inicializa os elementos e estados necessarios para esta funcionalidade (init).
  function init() {
    injectStyles();
    renderLauncher();
    watchLauncherHost();
    scheduleLauncherSync();
    restorePayload();

    window.addEventListener("protocord:znuny-transport", (event) => {
      handleTransport(event.detail?.payload);
    });
    window.addEventListener("message", handleExtensionMessage);
  }

  // Trata o evento ou acao do usuario neste fluxo (handle transport).
  function handleTransport(payload) {
    const normalized = normalizePayload(payload);
    if (!normalized) {
      notify("Nao foi possivel preparar o transporte.", "error");
      return false;
    }

    state.payload = normalized;
    persistPayload(normalized);
    copyPayloadToClipboard(normalized);
    renderApp();

    if (notifyBrowserExtension(normalized)) {
      notify("Transporte enviado para a extensao ProtoCord Znuny.", "success");
      return true;
    }

    const ticketUrl = getTicketUrl();
    if (!ticketUrl) {
      openApp();
      notify("Configure a URL do Znuny no plugin.", "warning");
      return true;
    }

    const opened = window.open(ticketUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      openApp();
      notify("Pop-up bloqueado. O relatorio ficou copiado.", "warning");
      return true;
    }

    notify("Relatorio copiado. Abrindo novo ticket no Znuny.", "success");
    return true;
  }

  // Busca ou resolve informacoes necessarias para o fluxo (get ticket url).
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

    if (!baseUrl) return DEFAULT_ZNUNY_TICKET_URL;

    try {
      return new URL("/znuny/index.pl?Action=AgentTicketPhone", baseUrl).toString();
    } catch (error) {
      return DEFAULT_ZNUNY_TICKET_URL;
    }
  }

  // Busca ou resolve informacoes necessarias para o fluxo (get payload).
  function getPayload() {
    return state.payload || restorePayload();
  }

  // Persiste dados ou configuracoes desta funcionalidade (persist payload).
  function persistPayload(payload) {
    const envelope = {
      payload,
      savedAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    localStorage.setItem(PAYLOAD_KEY, JSON.stringify(envelope));
    localStorage.setItem(AUTO_PAYLOAD_KEY, JSON.stringify(toZnunyClipboardPayload(payload)));
    window.PROTOCORD_LAST_ZNUNY_TRANSPORT_PAYLOAD = payload;
    window.PROTOCORD_ZNUNY_TRANSPORT_STORAGE_KEY = PAYLOAD_KEY;
  }

  // Prepara a copia, download ou exportacao dos dados (copy payload to clipboard).
  async function copyPayloadToClipboard(payload) {
    const html = String(payload?.relatorio || "");
    const text = String(payload?.relatorioTexto || stripHtml(html) || html || "");
    try {
      if (window.ClipboardItem && navigator.clipboard.write && html) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // O localStorage fica como fallback quando o clipboard for bloqueado pelo navegador.
    }
  }

  // Explica a responsabilidade de to znuny clipboard payload dentro deste modulo.
  function toZnunyClipboardPayload(payload) {
    return {
      contato: String(payload?.contato || ""),
      assunto: String(payload?.assunto || payload?.titulo || "Solicitacao de Suporte"),
      relatorio: String(payload?.relatorio || ""),
    };
  }

  // Explica a responsabilidade de notify browser extension dentro deste modulo.
  function notifyBrowserExtension(payload) {
    const extensionReady = document.documentElement?.dataset?.protocordZnunyExtension === "ready";
    if (!extensionReady) return false;

    window.postMessage({
      type: "PROTOCORD_ZNUNY_TRANSPORT",
      payload: toZnunyClipboardPayload(payload),
    }, window.location.origin);

    return true;
  }

  // Carrega ou restaura dados usados por esta funcionalidade (restore payload).
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

  // Normaliza, interpreta ou formata dados para uso seguro (normalize payload).
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

  // Renderiza a interface ou a parte visual correspondente (render launcher).
  function renderLauncher() {
    const host = findLauncherHost();
    const existing = document.getElementById("protocord-znuny-plugin-launcher");
    if (!host) {
      existing?.remove();
      return;
    }

    if (existing && existing.parentElement === host) return;

    const launcher = existing || document.createElement("button");
    launcher.id = "protocord-znuny-plugin-launcher";
    launcher.type = "button";
    launcher.title = "Configurar transporte Znuny";
    launcher.setAttribute("aria-label", "Configurar transporte Znuny");
    launcher.innerHTML = `
      <i data-lucide="settings" aria-hidden="true"></i>
    `;
    if (!launcher.dataset.znunyBound) {
      launcher.addEventListener("click", openApp);
      launcher.dataset.znunyBound = "true";
    }
    host.appendChild(launcher);
    window.lucide?.createIcons?.();
  }

  // Explica a responsabilidade de find launcher host dentro deste modulo.
  function findLauncherHost() {
    const page = document.getElementById("pagina-ia");
    if (!page) return null;
    const pageStyle = window.getComputedStyle(page);
    if (pageStyle.display === "none" || pageStyle.visibility === "hidden") return null;
    return page.querySelector(".ia-sidebar-header") || page.querySelector(".ia-sidebar-top");
  }

  // Explica a responsabilidade de watch launcher host dentro deste modulo.
  function watchLauncherHost() {
    if (state.launcherObserver) return;
    state.launcherObserver = new MutationObserver(() => renderLauncher());
    state.launcherObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true,
    });
  }

  // Explica a responsabilidade de schedule launcher sync dentro deste modulo.
  function scheduleLauncherSync() {
    let attempts = 0;
    // Explica a responsabilidade de timer dentro deste modulo.
    const timer = setInterval(() => {
      renderLauncher();
      attempts += 1;
      if (attempts >= 40 || document.getElementById("protocord-znuny-plugin-launcher")) {
        clearInterval(timer);
      }
    }, 500);
  }

  // Abre a interface, recurso ou fluxo solicitado (open app).
  function openApp() {
    state.appOpen = true;
    renderApp();
  }

  // Fecha a interface, recurso ou fluxo solicitado (close app).
  function closeApp() {
    state.appOpen = false;
    const app = document.getElementById("protocord-znuny-plugin-app");
    app?.remove();
  }

  // Renderiza a interface ou a parte visual correspondente (render app).
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
          <div class="znuny-plugin-install znuny-plugin-install-primary">
            <div>
              <span>Extensão do navegador</span>
              <strong id="znuny-plugin-extension-status">Verificando instalação...</strong>
              <p>Baixe a release oficial do ProtoCord para Chrome, Edge ou Opera.</p>
            </div>
            <div class="znuny-plugin-install-actions">
              <a class="znuny-plugin-primary" data-znuny-download="true" href="${EXTENSION_RELEASE_URL}" download>Baixar extensão</a>
              <button type="button" class="znuny-plugin-secondary" data-znuny-install="true">Como instalar</button>
            </div>
          </div>
          <div id="znuny-plugin-install-help" class="znuny-plugin-help hidden">
            <div class="znuny-plugin-wizard" data-znuny-step="1">
              <div class="znuny-plugin-stepper" aria-label="Instalacao assistida">
                <span class="active">1</span>
                <span>2</span>
                <span>3</span>
              </div>
              <div class="znuny-plugin-step" data-step="1">
                <strong>Baixe a release da extensão</strong>
                <p>Clique em Baixar extensão e extraia o arquivo ZIP em uma pasta permanente do computador.</p>
              </div>
              <div class="znuny-plugin-step hidden" data-step="2">
                <strong>Carregue no navegador</strong>
                <p>Abra a tela de extensões do Chrome, Edge ou Opera, ative o modo de desenvolvedor e selecione a pasta extraída da release.</p>
              </div>
              <div class="znuny-plugin-step hidden" data-step="3">
                <strong>Finalize e teste</strong>
                <p>Volte para Transcrever, gere um transporte e confirme o status como instalada. Depois o novo ticket abre com os campos preenchidos.</p>
              </div>
              <div class="znuny-plugin-wizard-actions">
                <button type="button" class="znuny-plugin-secondary" data-znuny-step-prev="true">Voltar</button>
                <button type="button" class="znuny-plugin-primary" data-znuny-step-next="true">Proximo</button>
              </div>
            </div>
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
          <div class="znuny-plugin-fieldset">
            <h3>Campos do ticket</h3>
            <div class="znuny-plugin-grid">
              <label>
                <span>Fila</span>
                <input type="text" data-znuny-fixed-field="Dest" value="6||Suporte::Suporte i9" />
              </label>
              <label>
                <span>Tipo</span>
                <input type="text" data-znuny-fixed-field="TypeID" value="3" />
              </label>
              <label>
                <span>Estado</span>
                <input type="text" data-znuny-fixed-field="NextStateID" value="13" />
              </label>
              <label>
                <span>Atendente</span>
                <input type="text" data-znuny-fixed-field="NewUserID" value="8" />
              </label>
              <label>
                <span>Prioridade</span>
                <input type="text" data-znuny-fixed-field="PriorityID" value="2" />
              </label>
              <label>
                <span>Servico</span>
                <input type="text" data-znuny-fixed-field="ServiceID" value="93" />
              </label>
              <label>
                <span>SLA</span>
                <input type="text" data-znuny-fixed-field="SLAID" value="Media" />
              </label>
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

    const payload = getPayload();
    app.querySelector("#znuny-plugin-subject").textContent = payload?.assunto || "Nenhum transporte preparado";
    app.querySelector("#znuny-plugin-contact").textContent = payload?.contato || "--";
    app.querySelector("#znuny-plugin-report").value = payload?.relatorioTexto || "";
    updateExtensionStatus(app);
    requestExtensionConfig();
  }

  // Explica a responsabilidade de bind app dentro deste modulo.
  function bindApp(app) {
    app.addEventListener("click", async (event) => {
      if (event.target?.closest?.("[data-znuny-close]")) {
        closeApp();
        return;
      }

      if (event.target?.closest?.("[data-znuny-save]")) {
        saveExtensionConfig(app);
        return;
      }

      if (event.target?.closest?.("[data-znuny-save-extension]")) {
        saveExtensionConfig(app);
        return;
      }

      if (event.target?.closest?.("[data-znuny-install]")) {
        app.querySelector("#znuny-plugin-install-help")?.classList.toggle("hidden");
        updateInstallWizard(app);
        return;
      }

      if (event.target?.closest?.("[data-znuny-step-prev]")) {
        state.installStep = Math.max(1, state.installStep - 1);
        updateInstallWizard(app);
        return;
      }

      if (event.target?.closest?.("[data-znuny-step-next]")) {
        if (state.installStep >= 3) {
          app.querySelector("#znuny-plugin-install-help")?.classList.add("hidden");
        } else {
          state.installStep += 1;
        }
        updateInstallWizard(app);
        return;
      }

      if (event.target?.closest?.("[data-znuny-open]")) {
        saveExtensionConfig(app);
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
        await copyPayloadToClipboard(payload);
        notify("Relatorio copiado.", "success");
      }
    });
  }

  // Persiste dados ou configuracoes desta funcionalidade (save config).
  function saveConfig(root) {
    saveExtensionConfig(root);
  }

  // Atualiza a tela, o estado interno ou dados derivados (update extension status).
  function updateExtensionStatus(root) {
    const status = root.querySelector("#znuny-plugin-extension-status");
    if (!status) return;
    status.textContent = document.documentElement?.dataset?.protocordZnunyExtension === "ready"
      ? "Instalada e pronta"
      : "Não detectada";
  }

  // Atualiza a tela, o estado interno ou dados derivados (update install wizard).
  function updateInstallWizard(root) {
    const wizard = root.querySelector(".znuny-plugin-wizard");
    if (!wizard) return;

    wizard.dataset.znunyStep = String(state.installStep);
    wizard.querySelectorAll(".znuny-plugin-step").forEach((step) => {
      step.classList.toggle("hidden", step.dataset.step !== String(state.installStep));
    });
    wizard.querySelectorAll(".znuny-plugin-stepper span").forEach((dot, index) => {
      dot.classList.toggle("active", index + 1 <= state.installStep);
    });

    const prev = wizard.querySelector("[data-znuny-step-prev]");
    const next = wizard.querySelector("[data-znuny-step-next]");
    if (prev) prev.disabled = state.installStep === 1;
    if (next) next.textContent = state.installStep >= 3 ? "Concluir" : "Proximo";
  }

  // Explica a responsabilidade de request extension config dentro deste modulo.
  function requestExtensionConfig() {
    if (document.documentElement?.dataset?.protocordZnunyExtension !== "ready") return;
    window.postMessage({ type: "PROTOCORD_ZNUNY_CONFIG_GET" }, window.location.origin);
  }

  // Persiste dados ou configuracoes desta funcionalidade (save extension config).
  function saveExtensionConfig(root) {
    const config = readExtensionConfig(root);
    localStorage.setItem("PROTOCORD_ZNUNY_FIELD_CONFIG", JSON.stringify(config));

    if (document.documentElement?.dataset?.protocordZnunyExtension !== "ready") {
      notify("Extensão não detectada. Configuração salva no ProtoCord.", "warning");
      return;
    }

    window.postMessage({
      type: "PROTOCORD_ZNUNY_CONFIG_SAVE",
      config,
    }, window.location.origin);
  }

  // Explica a responsabilidade de read extension config dentro deste modulo.
  function readExtensionConfig(root) {
    const fixedFields = {};
    root.querySelectorAll("[data-znuny-fixed-field]").forEach((input) => {
      fixedFields[input.dataset.znunyFixedField] = input.value.trim();
    });

    return {
      subjectFieldId: "Subject",
      contactFieldId: "DynamicField_Contato",
      richTextFieldId: "RichText",
      fixedFields: {
        Dest: "6||Suporte::Suporte i9",
        TypeID: "3",
        NextStateID: "13",
        NewUserID: "8",
        PriorityID: "2",
        ServiceID: "93",
        SLAID: "Media",
        ...fixedFields,
      },
    };
  }

  // Aplica valores, estado visual ou configuracoes no fluxo atual (apply extension config).
  function applyExtensionConfig(config) {
    const app = document.getElementById("protocord-znuny-plugin-app");
    if (!app || !config) return;

    app.querySelectorAll("[data-znuny-fixed-field]").forEach((input) => {
      input.value = config.fixedFields?.[input.dataset.znunyFixedField] ?? input.value;
    });
  }

  // Trata o evento ou acao do usuario neste fluxo (handle extension message).
  function handleExtensionMessage(event) {
    if (event.source !== window) return;
    if (event.data?.type === "PROTOCORD_ZNUNY_CONFIG_CURRENT") {
      applyExtensionConfig(event.data.config);
      return;
    }
    if (event.data?.type === "PROTOCORD_ZNUNY_CONFIG_SAVED") {
      if (event.data.ok) {
        applyExtensionConfig(event.data.config);
        notify("Mapeamento salvo na extensão.", "success");
      } else {
        notify("Falha ao salvar mapeamento na extensão.", "error");
      }
    }
  }

  // Explica a responsabilidade de strip html dentro deste modulo.
  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = String(html || "").replace(/<br\s*\/?>/gi, "\n");
    return String(div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  // Explica a responsabilidade de notify dentro deste modulo.
  function notify(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type || "info");
    }
  }

  // Explica a responsabilidade de inject styles dentro deste modulo.
  function injectStyles() {
    if (document.getElementById("protocord-znuny-plugin-style")) return;

    const style = document.createElement("style");
    style.id = "protocord-znuny-plugin-style";
    style.textContent = `
      :root {
        --znuny-plugin-overlay: rgba(3, 8, 18, .72);
        --znuny-plugin-shell-bg: linear-gradient(180deg, rgba(9, 20, 39, .98), rgba(5, 12, 26, .98));
        --znuny-plugin-panel: rgba(6, 14, 28, .58);
        --znuny-plugin-panel-strong: rgba(3, 8, 18, .54);
        --znuny-plugin-border: rgba(63, 104, 166, .42);
        --znuny-plugin-border-soft: rgba(63, 104, 166, .34);
        --znuny-plugin-title: #ffffff;
        --znuny-plugin-text: #e8eefc;
        --znuny-plugin-muted: #8fa4c7;
        --znuny-plugin-input-bg: rgba(3, 8, 18, .54);
        --znuny-plugin-shadow: 0 28px 80px rgba(0, 0, 0, .42);
      }

      html[data-theme="light"] {
        --znuny-plugin-overlay: rgba(15, 23, 42, .28);
        --znuny-plugin-shell-bg: linear-gradient(180deg, rgba(255, 255, 255, .98), rgba(240, 247, 255, .98));
        --znuny-plugin-panel: rgba(255, 255, 255, .76);
        --znuny-plugin-panel-strong: rgba(248, 251, 255, .92);
        --znuny-plugin-border: rgba(148, 163, 184, .46);
        --znuny-plugin-border-soft: rgba(191, 205, 224, .72);
        --znuny-plugin-title: #0f172a;
        --znuny-plugin-text: #1e293b;
        --znuny-plugin-muted: #64748b;
        --znuny-plugin-input-bg: rgba(255, 255, 255, .94);
        --znuny-plugin-shadow: 0 28px 80px rgba(15, 23, 42, .18);
      }

      #protocord-znuny-plugin-launcher {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 26px;
        right: 22px;
        border: 1px solid rgba(40, 198, 229, .32);
        border-radius: 999px;
        background: rgba(8, 17, 34, .92);
        color: #e8eefc;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .18);
        width: 34px;
        height: 34px;
        padding: 0;
        cursor: pointer;
        margin: 0;
        flex: 0 0 auto;
        transition: border-color .18s ease, transform .18s ease, background .18s ease;
      }

      #protocord-znuny-plugin-launcher:hover {
        border-color: rgba(40, 198, 229, .62);
        background: rgba(12, 27, 51, .96);
        transform: translateY(-1px);
      }

      #protocord-znuny-plugin-launcher i,
      #protocord-znuny-plugin-launcher svg {
        width: 17px;
        height: 17px;
      }

      #protocord-znuny-plugin-app {
        position: fixed;
        inset: 0;
        z-index: 120;
      }

      .znuny-plugin-backdrop {
        position: absolute;
        inset: 0;
        background: var(--znuny-plugin-overlay);
        backdrop-filter: blur(8px);
      }

      .znuny-plugin-shell {
        position: absolute;
        right: 26px;
        bottom: 26px;
        width: min(560px, calc(100vw - 32px));
        max-height: calc(100vh - 52px);
        overflow: auto;
        border: 1px solid var(--znuny-plugin-border);
        border-radius: 22px;
        background: var(--znuny-plugin-shell-bg);
        box-shadow: var(--znuny-plugin-shadow);
        color: var(--znuny-plugin-text);
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
        color: var(--znuny-plugin-muted);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .znuny-plugin-header h2 {
        margin: 5px 0 0;
        color: var(--znuny-plugin-title);
        font-size: 24px;
        line-height: 1.1;
      }

      .znuny-plugin-icon,
      .znuny-plugin-secondary,
      .znuny-plugin-primary {
        border: 1px solid var(--znuny-plugin-border);
        border-radius: 12px;
        background: var(--znuny-plugin-panel);
        color: var(--znuny-plugin-text);
        cursor: pointer;
        font-weight: 800;
      }

      .znuny-plugin-icon {
        width: 36px;
        height: 36px;
      }

      .znuny-plugin-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .znuny-plugin-fieldset {
        border: 1px solid var(--znuny-plugin-border-soft);
        border-radius: 16px;
        background: var(--znuny-plugin-panel-strong);
        margin-top: 14px;
        padding: 14px;
      }

      .znuny-plugin-fieldset h3 {
        margin: 0;
        color: var(--znuny-plugin-title);
        font-size: 16px;
        line-height: 1.2;
      }

      .znuny-plugin-install {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border: 1px solid var(--znuny-plugin-border-soft);
        border-radius: 14px;
        background: var(--znuny-plugin-panel);
        margin-top: 14px;
        padding: 12px;
      }

      .znuny-plugin-install strong {
        display: block;
        margin-top: 5px;
        color: var(--znuny-plugin-title);
        font-size: 13px;
      }

      .znuny-plugin-install p {
        margin: 6px 0 0;
        color: var(--znuny-plugin-muted);
        font-size: 12px;
        line-height: 1.35;
      }

      .znuny-plugin-install-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
      }

      .znuny-plugin-help {
        border: 1px solid rgba(40, 198, 229, .24);
        border-radius: 12px;
        background: rgba(40, 198, 229, .08);
        color: var(--znuny-plugin-text);
        font-size: 12px;
        line-height: 1.45;
        margin-top: 10px;
        padding: 12px;
      }

      .znuny-plugin-help p {
        margin: 0;
      }

      .znuny-plugin-stepper {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .znuny-plugin-stepper span {
        display: inline-grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: rgba(63, 104, 166, .18);
        color: #8fa4c7;
        font-size: 12px;
        font-weight: 900;
      }

      .znuny-plugin-stepper span.active {
        background: #28c6e5;
        color: #03101d;
      }

      .znuny-plugin-step strong {
        display: block;
        color: var(--znuny-plugin-title);
        margin-bottom: 6px;
      }

      .znuny-plugin-wizard-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 14px;
      }

      .znuny-plugin-config {
        margin-top: 14px;
      }

      .znuny-plugin-config-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 9px;
      }

      .znuny-plugin-grid input,
      .znuny-plugin-config-grid input,
      #znuny-plugin-report {
        width: 100%;
        margin-top: 7px;
        border: 1px solid var(--znuny-plugin-border);
        border-radius: 12px;
        background: var(--znuny-plugin-input-bg);
        color: var(--znuny-plugin-text);
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
        border: 1px solid var(--znuny-plugin-border-soft);
        border-radius: 14px;
        background: var(--znuny-plugin-panel);
        padding: 12px;
      }

      .znuny-plugin-preview strong {
        display: block;
        margin-top: 6px;
        color: var(--znuny-plugin-title);
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
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
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

        .znuny-plugin-grid {
          grid-template-columns: 1fr;
        }

        .znuny-plugin-config-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }
})();
