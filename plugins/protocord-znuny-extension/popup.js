const title = document.getElementById("status-title");
const detail = document.getElementById("status-detail");
const subject = document.getElementById("subject");
const contact = document.getElementById("contact");
const clear = document.getElementById("clear");
const saveConfig = document.getElementById("save-config");
const subjectField = document.getElementById("subject-field");
const contactField = document.getElementById("contact-field");
const richField = document.getElementById("rich-field");

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
    subjectFieldId: subjectField.value.trim(),
    contactFieldId: contactField.value.trim(),
    richTextFieldId: richField.value.trim(),
    fixedFields,
  };
}

function renderConfig(config) {
  subjectField.value = config.subjectFieldId || "Subject";
  contactField.value = config.contactFieldId || "DynamicField_Contato";
  richField.value = config.richTextFieldId || "RichText";
  document.querySelectorAll("[data-fixed-field]").forEach((input) => {
    input.value = config.fixedFields?.[input.dataset.fixedField] || "";
  });
}
