const ZNUNY_HOST = ["rhede", "serviceup", "app"].join(".");
const ZNUNY_TICKET_URL = `https://${ZNUNY_HOST}/znuny/index.pl?Action=AgentTicketPhone`;
const STORAGE_KEY = "lastPayload";
const CONFIG_KEY = "fieldConfig";
const DEFAULT_FIELD_CONFIG = {
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
  },
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PROTOCORD_ZNUNY_OPEN") {
    const payload = normalizePayload(message.payload);
    if (!payload) {
      sendResponse({ ok: false, error: "invalid-payload" });
      return false;
    }

    chrome.storage.local.set({
      [STORAGE_KEY]: {
        payload,
        savedAt: Date.now(),
      },
    }, () => {
      chrome.tabs.create({ url: ZNUNY_TICKET_URL, active: true }, (tab) => {
        sendResponse({ ok: true, tabId: tab?.id || null });
      });
    });
    return true;
  }

  if (message?.type === "PROTOCORD_ZNUNY_STATUS") {
    chrome.storage.local.get([STORAGE_KEY, CONFIG_KEY], (data) => {
      sendResponse({
        ok: true,
        entry: data[STORAGE_KEY] || null,
        config: mergeConfig(data[CONFIG_KEY]),
      });
    });
    return true;
  }

  if (message?.type === "PROTOCORD_ZNUNY_CONFIG_GET") {
    chrome.storage.local.get(CONFIG_KEY, (data) => {
      sendResponse({ ok: true, config: mergeConfig(data[CONFIG_KEY]) });
    });
    return true;
  }

  if (message?.type === "PROTOCORD_ZNUNY_CONFIG_SAVE") {
    const config = mergeConfig(message.config);
    chrome.storage.local.set({ [CONFIG_KEY]: config }, () => {
      sendResponse({ ok: true, config });
    });
    return true;
  }

  if (message?.type === "PROTOCORD_ZNUNY_CLEAR") {
    chrome.storage.local.remove(STORAGE_KEY, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});

// Normaliza, interpreta ou formata dados para uso seguro (normalize payload).
function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const normalized = {
    contato: String(payload.contato || "").trim(),
    assunto: String(payload.assunto || payload.titulo || "Solicitacao de Suporte").trim(),
    relatorio: String(payload.relatorio || "").trim(),
  };

  return normalized.contato && normalized.relatorio ? normalized : null;
}

// Explica a responsabilidade de merge config dentro deste modulo.
function mergeConfig(config = {}) {
  return {
    subjectFieldId: String(config.subjectFieldId || DEFAULT_FIELD_CONFIG.subjectFieldId),
    contactFieldId: String(config.contactFieldId || DEFAULT_FIELD_CONFIG.contactFieldId),
    richTextFieldId: String(config.richTextFieldId || DEFAULT_FIELD_CONFIG.richTextFieldId),
    fixedFields: {
      ...DEFAULT_FIELD_CONFIG.fixedFields,
      ...(config.fixedFields || {}),
    },
  };
}
