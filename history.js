// js/history.js
function addMessage(sender, text, type = "bot") {
  const p = document.createElement("div");
  p.className = `message ${type}`;
  p.innerHTML = `<div class="meta"><strong>${sender}</strong></div><div>${text}</div>`;
  chatEl.appendChild(p);
  chatEl.scrollTop = chatEl.scrollHeight;

  let history = JSON.parse(localStorage.getItem("chat_history") || "[]");
  history.push({ sender, text, type });
  localStorage.setItem("chat_history", JSON.stringify(history));
}

function loadChatHistory() {
  const history = JSON.parse(localStorage.getItem("chat_history") || "[]");
  history.forEach(msg => addMessage(msg.sender, msg.text, msg.type));
}
