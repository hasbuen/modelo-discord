// js/main.js
async function sendMessage() {
  const input = inputEl.value.trim();
  if (!input) return;

  addMessage("Você", input, "user");
  inputEl.value = "";
  addMessage("Skynet", "<em>processando...</em>", "bot");

  const placeholder = chatEl.lastElementChild;

  try {
    const resp = await getBotResponse(input);
    if (placeholder) chatEl.removeChild(placeholder);
    addMessage("Skynet", resp.text, "bot");
  } catch (err) {
    console.error("Erro no sendMessage:", err);
    if (placeholder) chatEl.removeChild(placeholder);
    addMessage("Skynet", `⚠️ Erro ao processar: ${err.message}`, "bot");
  }
}

// Inicialização
loadChatHistory();
loadModelAndData();
