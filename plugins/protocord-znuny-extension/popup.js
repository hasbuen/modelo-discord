const title = document.getElementById("status-title");
const detail = document.getElementById("status-detail");
const subject = document.getElementById("subject");
const contact = document.getElementById("contact");
const clear = document.getElementById("clear");
const saveConfig = document.getElementById("save-config");

chrome.runtime.sendMessage({ type: "PROTOCORD_ZNUNY_STATUS" }, (response) => {
  const entry = response?.entry;
  if (response?.config) renderConfig(response.config);
  if (!entry?.payload) return;

  title.textContent = "Transporte preparado";
  detail.textContent = new Date(entry.savedAt || Date.now()).toLocaleString("pt-BR");
  subject.textContent = entry.payload.assunto || "--";
  contact.textContent = entry.payload.contato || "--";
});

saveConfig.addEventListener("click", () => {
  chrome.runtime.sendMessage({
    type: "PROTOCORD_ZNUNY_CONFIG_SAVE",
    config: readConfig(),
  }, (response) => {
    if (response?.config) renderConfig(response.config);
  });
});

clear.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "PROTOCORD_ZNUNY_CLEAR" }, () => {
    title.textContent = "Aguardando transporte";
    detail.textContent = "Clique em Transportar dentro do ProtoCord.";
    subject.textContent = "--";
    contact.textContent = "--";
  });
});

function readConfig() {
  const fixedFields = {};
  document.querySelectorAll("[data-fixed-field]").forEach((input) => {
    fixedFields[input.dataset.fixedField] = input.value.trim();
  });

  return {
    subjectFieldId: "Subject",
    contactFieldId: "DynamicField_Contato",
    richTextFieldId: "RichText",
    fixedFields,
  };
}

function renderConfig(config) {
  document.querySelectorAll("[data-fixed-field]").forEach((input) => {
    input.value = config.fixedFields?.[input.dataset.fixedField] || "";
  });
}
