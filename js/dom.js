// js/dom.js
const chatEl = document.getElementById("chat");
const statusEl = document.getElementById("status");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Define sendMessage se não existir globalmente
if (typeof window.sendMessage === 'undefined') {
  window.sendMessage = function() {
    if (inputEl && inputEl.value.trim()) {
      console.log('Mensagem recebida:', inputEl.value);
      // Aqui você pode adicionar a lógica de envio
    }
  };
}

if (sendBtn) {
  sendBtn.addEventListener("click", window.sendMessage);
}
if (inputEl) {
  inputEl.addEventListener("keyup", (e) => {
    if (e.key === "Enter") window.sendMessage();
  });
}
