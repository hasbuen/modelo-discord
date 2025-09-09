// js/dom.js
const chatEl = document.getElementById("chat");
const statusEl = document.getElementById("status");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keyup", (e) => {
  if (e.key === "Enter") sendMessage();
});
