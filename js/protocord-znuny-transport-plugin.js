(function () {
  "use strict";

  const PLUGIN_ID = "znuny-transport";
  const PAYLOAD_KEY = "protocord_znuny_transport_payload_v1";
  const AUTO_PAYLOAD_KEY = "znuny_auto_payload";
  const BASE_URL_KEY = "PROTOCORD_ZNUNY_BASE_URL";
  const TICKET_URL_KEY = "PROTOCORD_ZNUNY_TICKET_URL";
  const DEFAULT_ZNUNY_HOST = ["rhede", "serviceup", "app"].join(".");
  const DEFAULT_ZNUNY_TICKET_URL = `https://${DEFAULT_ZNUNY_HOST}/znuny/index.pl?Action=AgentTicketPhone`;

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
    localStorage.setItem(AUTO_PAYLOAD_KEY, JSON.stringify(toZnunyClipboardPayload(payload)));
    window.PROTOCORD_LAST_ZNUNY_TRANSPORT_PAYLOAD = payload;
    window.PROTOCORD_ZNUNY_TRANSPORT_STORAGE_KEY = PAYLOAD_KEY;
  }

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

  function toZnunyClipboardPayload(payload) {
    return {
      contato: String(payload?.contato || ""),
      assunto: String(payload?.assunto || payload?.titulo || "Solicitacao de Suporte"),
      relatorio: String(payload?.relatorio || ""),
    };
  }

  function notifyBrowserExtension(payload) {
    const extensionReady = document.documentElement?.dataset?.protocordZnunyExtension === "ready";
    if (!extensionReady) return false;

    window.postMessage({
      type: "PROTOCORD_ZNUNY_TRANSPORT",
      payload: toZnunyClipboardPayload(payload),
    }, window.location.origin);

    return true;
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

  function findLauncherHost() {
    const page = document.getElementById("pagina-ia");
    if (!page) return null;
    const pageStyle = window.getComputedStyle(page);
    if (pageStyle.display === "none" || pageStyle.visibility === "hidden") return null;
    return page.querySelector(".ia-sidebar-header") || page.querySelector(".ia-sidebar-top");
  }

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

  function scheduleLauncherSync() {
    let attempts = 0;
    const timer = setInterval(() => {
      renderLauncher();
      attempts += 1;
      if (attempts >= 40 || document.getElementById("protocord-znuny-plugin-launcher")) {
        clearInterval(timer);
      }
    }, 500);
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
              <input id="znuny-plugin-base-url" type="url" placeholder="https://portal-rhede" />
            </label>
            <label>
              <span>URL de novo ticket</span>
              <input id="znuny-plugin-ticket-url" type="url" placeholder="https://portal-rhede/znuny/index.pl?Action=AgentTicketPhone" />
            </label>
          </div>
          <div class="znuny-plugin-install">
            <div>
              <span>Extensão do navegador</span>
              <strong id="znuny-plugin-extension-status">Verificando instalação...</strong>
            </div>
            <button type="button" class="znuny-plugin-secondary" data-znuny-install="true">Como instalar</button>
          </div>
          <div id="znuny-plugin-install-help" class="znuny-plugin-help hidden">
            <div class="znuny-plugin-wizard" data-znuny-step="1">
              <div class="znuny-plugin-stepper" aria-label="Instalacao assistida">
                <span class="active">1</span>
                <span>2</span>
                <span>3</span>
              </div>
              <div class="znuny-plugin-step" data-step="1">
                <strong>Abra as extensoes do navegador</strong>
                <p>Use o menu do Chrome, Edge ou Opera e entre em Extensoes. Navegadores bloqueiam instalacao silenciosa fora das lojas oficiais.</p>
              </div>
              <div class="znuny-plugin-step hidden" data-step="2">
                <strong>Carregue a extensao ProtoCord</strong>
                <p>Ative o modo de desenvolvedor e selecione a pasta <b>modelo-discord/plugins/protocord-znuny-extension</b>.</p>
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
          <div class="znuny-plugin-config">
            <span>Mapeamento dos campos</span>
            <div class="znuny-plugin-config-grid">
              <label>Assunto<input id="znuny-config-subject" value="Subject" /></label>
              <label>Contato<input id="znuny-config-contact" value="DynamicField_Contato" /></label>
              <label>Editor<input id="znuny-config-richtext" value="RichText" /></label>
              <label>Dest<input data-znuny-fixed-field="Dest" value="6||Suporte::Suporte i9" /></label>
              <label>TypeID<input data-znuny-fixed-field="TypeID" value="3" /></label>
              <label>NextStateID<input data-znuny-fixed-field="NextStateID" value="13" /></label>
              <label>NewUserID<input data-znuny-fixed-field="NewUserID" value="8" /></label>
              <label>PriorityID<input data-znuny-fixed-field="PriorityID" value="2" /></label>
              <label>ServiceID<input data-znuny-fixed-field="ServiceID" value="93" /></label>
              <label>SLAID<input data-znuny-fixed-field="SLAID" value="Media" /></label>
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
          <textarea id="znuny-plugin-report" readonly></textarea>
          <footer class="znuny-plugin-actions">
            <button type="button" class="znuny-plugin-secondary" data-znuny-copy="true">Copiar relatorio</button>
            <button type="button" class="znuny-plugin-secondary" data-znuny-save-extension="true">Salvar campos</button>
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
    updateExtensionStatus(app);
    requestExtensionConfig();
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
        await copyPayloadToClipboard(payload);
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

  function updateExtensionStatus(root) {
    const status = root.querySelector("#znuny-plugin-extension-status");
    if (!status) return;
    status.textContent = document.documentElement?.dataset?.protocordZnunyExtension === "ready"
      ? "Instalada e pronta"
      : "Não detectada";
  }

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

  function requestExtensionConfig() {
    if (document.documentElement?.dataset?.protocordZnunyExtension !== "ready") return;
    window.postMessage({ type: "PROTOCORD_ZNUNY_CONFIG_GET" }, window.location.origin);
  }

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

  function readExtensionConfig(root) {
    const fixedFields = {};
    root.querySelectorAll("[data-znuny-fixed-field]").forEach((input) => {
      fixedFields[input.dataset.znunyFixedField] = input.value.trim();
    });

    return {
      subjectFieldId: root.querySelector("#znuny-config-subject")?.value?.trim() || "Subject",
      contactFieldId: root.querySelector("#znuny-config-contact")?.value?.trim() || "DynamicField_Contato",
      richTextFieldId: root.querySelector("#znuny-config-richtext")?.value?.trim() || "RichText",
      fixedFields,
    };
  }

  function applyExtensionConfig(config) {
    const app = document.getElementById("protocord-znuny-plugin-app");
    if (!app || !config) return;

    app.querySelector("#znuny-config-subject").value = config.subjectFieldId || "Subject";
    app.querySelector("#znuny-config-contact").value = config.contactFieldId || "DynamicField_Contato";
    app.querySelector("#znuny-config-richtext").value = config.richTextFieldId || "RichText";
    app.querySelectorAll("[data-znuny-fixed-field]").forEach((input) => {
      input.value = config.fixedFields?.[input.dataset.znunyFixedField] ?? input.value;
    });
  }

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

      .znuny-plugin-install {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border: 1px solid rgba(63, 104, 166, .34);
        border-radius: 14px;
        background: rgba(6, 14, 28, .58);
        margin-top: 14px;
        padding: 12px;
      }

      .znuny-plugin-install strong {
        display: block;
        margin-top: 5px;
        color: #fff;
        font-size: 13px;
      }

      .znuny-plugin-help {
        border: 1px solid rgba(40, 198, 229, .24);
        border-radius: 12px;
        background: rgba(40, 198, 229, .08);
        color: #bcd0ee;
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
        color: #fff;
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

        .znuny-plugin-config-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }
})();
