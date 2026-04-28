// ==UserScript==
// @name         ProtoCord Znuny Transporter
// @namespace    protocord
// @version      1.0.0
// @description  Transporta o relatório do ProtoCord para a tela de novo ticket do Znuny.
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    // Ajuste para a URL real do seu Znuny, se ela nao estiver configurada no ProtoCord.
    znunyNewTicketUrl: "",
    protocordHostPattern: /protocord|modelo-discord|github\.io|localhost|127\.0\.0\.1/i,
    znunyHostPattern: /znuny|otrs|suporte|portal/i,
    payloadKey: "protocord.znuny.transport.payload",
    maxPayloadAgeMs: 30 * 60 * 1000,
  };

  const state = {
    filled: false,
  };

  if (isProtocordPage()) {
    installProtocordBridge();
  }

  if (isZnunyPage()) {
    installZnunyBridge();
  }

  function isProtocordPage() {
    return CONFIG.protocordHostPattern.test(location.host) ||
      Boolean(document.querySelector("#ia-copy-znuny-btn, #pagina-ia"));
  }

  function isZnunyPage() {
    return CONFIG.znunyHostPattern.test(location.host) ||
      /Action=AgentTicket(?:Phone|Email|Process)/i.test(location.href) ||
      Boolean(document.querySelector("form[action*='index.pl']"));
  }

  function installProtocordBridge() {
    window.addEventListener("protocord:znuny-transport", (event) => {
      const payload = normalizePayload(event.detail?.payload);
      if (!payload) return;

      savePayload(payload);
      const url = hasNativeZnunyUrl() ? "" : resolveZnunyUrl();
      if (url) {
        GM_openInTab(url, { active: true, insert: true, setParent: true });
      }
    });

    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("#ia-copy-znuny-btn");
      if (!button) return;

      setTimeout(() => {
        const payload = normalizePayload(window.PROTOCORD_LAST_ZNUNY_TRANSPORT_PAYLOAD || readLocalPayload());
        if (!payload) return;
        savePayload(payload);
      }, 50);
    }, true);
  }

  function installZnunyBridge() {
    const run = () => {
      if (state.filled) return;

      const payload = loadPayload();
      if (!payload) return;

      const filled = fillZnunyForm(payload);
      if (filled) {
        state.filled = true;
        showNotice("Dados do ProtoCord aplicados ao novo ticket.");
      }
    };

    run();
    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  function resolveZnunyUrl() {
    const explicit = CONFIG.znunyNewTicketUrl ||
      window.PROTOCORD_RUNTIME_CONFIG?.ZNUNY_TICKET_URL ||
      localStorage.getItem("PROTOCORD_ZNUNY_TICKET_URL") ||
      "";

    if (explicit) return explicit;

    const base = window.PROTOCORD_RUNTIME_CONFIG?.ZNUNY_BASE_URL ||
      localStorage.getItem("PROTOCORD_ZNUNY_BASE_URL") ||
      "";

    if (!base) return "";

    try {
      return new URL("/znuny/index.pl?Action=AgentTicketPhone", base).toString();
    } catch (error) {
      return "";
    }
  }

  function hasNativeZnunyUrl() {
    return Boolean(
      window.PROTOCORD_RUNTIME_CONFIG?.ZNUNY_TICKET_URL ||
      localStorage.getItem("PROTOCORD_ZNUNY_TICKET_URL") ||
      window.PROTOCORD_RUNTIME_CONFIG?.ZNUNY_BASE_URL ||
      localStorage.getItem("PROTOCORD_ZNUNY_BASE_URL")
    );
  }

  function savePayload(payload) {
    GM_setValue(CONFIG.payloadKey, {
      payload,
      savedAt: Date.now(),
    });
  }

  function loadPayload() {
    const stored = GM_getValue(CONFIG.payloadKey);
    if (!stored?.payload) return null;
    if (Date.now() - Number(stored.savedAt || 0) > CONFIG.maxPayloadAgeMs) {
      GM_deleteValue(CONFIG.payloadKey);
      return null;
    }
    return normalizePayload(stored.payload);
  }

  function readLocalPayload() {
    try {
      const raw = localStorage.getItem("protocord_znuny_transport_payload_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.payload || parsed;
    } catch (error) {
      return null;
    }
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    return {
      contato: String(payload.contato || ""),
      telefone: String(payload.telefone || ""),
      assunto: String(payload.assunto || payload.titulo || "Solicitacao de Suporte"),
      titulo: String(payload.titulo || payload.assunto || "Solicitacao de Suporte"),
      relatorio: String(payload.relatorio || ""),
      relatorioTexto: String(payload.relatorioTexto || stripHtml(payload.relatorio || "")),
      problema: String(payload.problema || ""),
      solucao: String(payload.solucao || ""),
    };
  }

  function fillZnunyForm(payload) {
    let count = 0;

    count += setField([
      "input[name='Title']",
      "input[name='Subject']",
      "input#Title",
      "input#Subject",
    ], payload.assunto);

    count += setField([
      "input[name='CustomerUser']",
      "input[name='CustomerUserLogin']",
      "input[name='FromCustomer']",
      "input#CustomerUser",
      "input#FromCustomer",
    ], payload.contato || payload.telefone);

    count += setField([
      "textarea[name='Body']",
      "textarea#Body",
      "textarea[name='RichText']",
    ], payload.relatorioTexto);

    count += setRichText(payload.relatorio || payload.relatorioTexto);

    return count > 0;
  }

  function setField(selectors, value) {
    const text = String(value || "").trim();
    if (!text) return 0;

    for (const selector of selectors) {
      const field = document.querySelector(selector);
      if (!field || field.disabled || field.readOnly) continue;
      field.focus();
      field.value = text;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return 1;
    }

    return 0;
  }

  function setRichText(value) {
    const html = String(value || "").trim();
    if (!html) return 0;

    const editable = document.querySelector("[contenteditable='true'][id*='RichText'], [contenteditable='true'][class*='RichText'], [contenteditable='true']");
    if (editable) {
      editable.focus();
      editable.innerHTML = html;
      editable.dispatchEvent(new Event("input", { bubbles: true }));
      editable.dispatchEvent(new Event("change", { bubbles: true }));
      return 1;
    }

    for (const frame of document.querySelectorAll("iframe")) {
      try {
        const body = frame.contentDocument?.body;
        if (!body || body.contentEditable !== "true") continue;
        body.focus();
        body.innerHTML = html;
        body.dispatchEvent(new Event("input", { bubbles: true }));
        body.dispatchEvent(new Event("change", { bubbles: true }));
        return 1;
      } catch (error) {
        // Iframes de outra origem nao podem ser acessados pelo userscript.
      }
    }

    return 0;
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = String(html || "").replace(/<br\s*\/?>/gi, "\n");
    return String(div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function showNotice(message) {
    const notice = document.createElement("div");
    notice.textContent = message;
    notice.style.cssText = [
      "position:fixed",
      "right:18px",
      "bottom:18px",
      "z-index:2147483647",
      "background:#0f172a",
      "color:#e0f2fe",
      "border:1px solid rgba(56,189,248,.35)",
      "box-shadow:0 18px 45px rgba(15,23,42,.28)",
      "border-radius:12px",
      "padding:12px 14px",
      "font:600 13px/1.35 Inter,Arial,sans-serif",
    ].join(";");
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 3500);
  }
})();
