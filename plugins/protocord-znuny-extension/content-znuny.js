(function () {
  "use strict";

  const STORAGE_KEY = "lastPayload";
  const CONFIG_KEY = "fieldConfig";
  const MAX_PAYLOAD_AGE_MS = 30 * 60 * 1000;
  const defaultConfig = {
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

  let applied = false;
  let fieldConfig = defaultConfig;

  bootstrap();

  function bootstrap() {
    chrome.storage.local.get([STORAGE_KEY, CONFIG_KEY], (data) => {
      fieldConfig = mergeConfig(data[CONFIG_KEY]);
      fillFixedFields();
      const entry = data[STORAGE_KEY];
      if (!entry?.payload || Date.now() - Number(entry.savedAt || 0) > MAX_PAYLOAD_AGE_MS) return;
      applyWhenReady(entry.payload);
    });
  }

  function applyWhenReady(payload) {
    const run = () => {
      if (applied) return;
      if (applyPayload(payload)) {
        applied = true;
        showNotice("Dados do ProtoCord aplicados ao ticket.");
      }
    };

    run();
    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 20000);
  }

  function fillFixedFields() {
    document.getElementById("OwnerSelectionGetAll")?.click();

    let attempts = 0;
    const timer = setInterval(() => {
      Object.entries(fieldConfig.fixedFields).forEach(([id, value]) => {
        if (value !== "") setFieldById(id, value);
      });
      attempts += 1;
      if (attempts > 20) clearInterval(timer);
    }, 500);
  }

  function applyPayload(payload) {
    const subject = String(payload.assunto || payload.titulo || "Solicitacao de Suporte").trim();
    const contact = String(payload.contato || "").trim();
    const report = String(payload.relatorio || "").trim();

    let count = 0;
    if (subject) count += setFieldById(fieldConfig.subjectFieldId, subject);
    if (contact) {
      count += setFieldById(fieldConfig.contactFieldId, contact);
      document.getElementById(fieldConfig.contactFieldId)?.dispatchEvent(new Event("blur", { bubbles: true }));
    }
    const reportApplied = report ? setRichText(report) : 1;
    if (reportApplied) count += 1;

    return count >= 2 && reportApplied > 0;
  }

  function setFieldById(id, value) {
    const field = document.getElementById(id);
    if (!field) return 0;
    if (field.value === value) return 1;

    field.focus?.();
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));

    triggerPageChange(id);
    return 1;
  }

  function triggerPageChange(id) {
    const script = document.createElement("script");
    script.textContent = `
      (function () {
        var el = document.getElementById(${JSON.stringify(id)});
        if (el && window.$) window.$(el).trigger("change");
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
  }

  function setRichText(html) {
    if (setCkEditorViaPage(html)) return 1;

    const textArea = document.getElementById(fieldConfig.richTextFieldId);
    if (textArea) {
      textArea.value = html;
      textArea.dispatchEvent(new Event("input", { bubbles: true }));
      textArea.dispatchEvent(new Event("change", { bubbles: true }));
      return 1;
    }

    const editable = document.querySelector("[contenteditable='true']");
    if (editable) {
      editable.innerHTML = html;
      editable.dispatchEvent(new Event("input", { bubbles: true }));
      editable.dispatchEvent(new Event("change", { bubbles: true }));
      return 1;
    }

    for (const frame of document.querySelectorAll("iframe")) {
      try {
        const body = frame.contentDocument?.body;
        if (!body) continue;
        body.innerHTML = html;
        body.dispatchEvent(new Event("input", { bubbles: true }));
        body.dispatchEvent(new Event("change", { bubbles: true }));
        return 1;
      } catch (_error) {
        // Iframes cross-origin nao sao manipulaveis pelo content script.
      }
    }

    return 0;
  }

  function setCkEditorViaPage(html) {
    const marker = "protocordZnunyRichtextApplied";
    delete document.documentElement.dataset[marker];
    const script = document.createElement("script");
    script.textContent = `
      (function () {
        var data = ${JSON.stringify(html)};
        if (!window.CKEDITOR || !window.CKEDITOR.instances) return;
        var editor = window.CKEDITOR.instances.RichText || Object.values(window.CKEDITOR.instances)[0];
        if (!editor) return;
        editor.setData(data);
        editor.focus();
        document.documentElement.dataset.protocordZnunyRichtextApplied = "true";
        window.dispatchEvent(new CustomEvent("protocord-znuny-richtext-applied"));
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
    return document.documentElement.dataset[marker] === "true";
  }

  function mergeConfig(config = {}) {
    return {
      subjectFieldId: String(config.subjectFieldId || defaultConfig.subjectFieldId),
      contactFieldId: String(config.contactFieldId || defaultConfig.contactFieldId),
      richTextFieldId: String(config.richTextFieldId || defaultConfig.richTextFieldId),
      fixedFields: {
        ...defaultConfig.fixedFields,
        ...(config.fixedFields || {}),
      },
    };
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
      "border-radius:10px",
      "box-shadow:0 18px 45px rgba(15,23,42,.28)",
      "padding:11px 13px",
      "font:600 13px/1.35 Arial,sans-serif",
    ].join(";");
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 3500);
  }
})();
