(function () {
  "use strict";

  const AUTO_PAYLOAD_KEY = "znuny_auto_payload";
  const LEGACY_PAYLOAD_KEY = "protocord_znuny_transport_payload_v1";
  let lastSentAt = 0;

  document.documentElement.dataset.protocordZnunyExtension = "ready";

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type === "PROTOCORD_ZNUNY_TRANSPORT") {
      sendPayload(event.data.payload);
      return;
    }
    if (event.data?.type === "PROTOCORD_ZNUNY_CONFIG_SAVE") {
      chrome.runtime.sendMessage({
        type: "PROTOCORD_ZNUNY_CONFIG_SAVE",
        config: event.data.config,
      }, (response) => {
        window.postMessage({
          type: "PROTOCORD_ZNUNY_CONFIG_SAVED",
          ok: Boolean(response?.ok),
          config: response?.config || null,
        }, window.location.origin);
      });
      return;
    }
    if (event.data?.type === "PROTOCORD_ZNUNY_CONFIG_GET") {
      chrome.runtime.sendMessage({ type: "PROTOCORD_ZNUNY_CONFIG_GET" }, (response) => {
        window.postMessage({
          type: "PROTOCORD_ZNUNY_CONFIG_CURRENT",
          ok: Boolean(response?.ok),
          config: response?.config || null,
        }, window.location.origin);
      });
    }
  });

  document.addEventListener("click", (event) => {
    const transportButton = event.target?.closest?.("#ia-copy-znuny-btn");
    if (!transportButton) return;

    setTimeout(() => {
      const payload = readPayloadFromApp();
      if (payload) sendPayload(payload);
    }, 250);
  }, true);

  function sendPayload(payload) {
    const normalized = normalizePayload(payload);
    if (!normalized) return;

    const now = Date.now();
    if (now - lastSentAt < 900) return;
    lastSentAt = now;

    chrome.runtime.sendMessage({
      type: "PROTOCORD_ZNUNY_OPEN",
      payload: normalized,
    });
  }

  function readPayloadFromApp() {
    const direct = readJson(localStorage.getItem(AUTO_PAYLOAD_KEY));
    if (direct) return direct;

    const legacy = readJson(localStorage.getItem(LEGACY_PAYLOAD_KEY));
    return legacy?.payload || legacy || null;
  }

  function readJson(raw) {
    if (!raw || raw === "undefined") return null;
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    const normalized = {
      contato: String(payload.contato || "").trim(),
      assunto: String(payload.assunto || payload.titulo || "Solicitacao de Suporte").trim(),
      relatorio: String(payload.relatorio || "").trim(),
    };

    return normalized.contato && normalized.relatorio ? normalized : null;
  }
})();
