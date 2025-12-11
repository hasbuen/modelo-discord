export async function enviarPergunta() {
  const input = document.getElementById("chat-input");
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const loadingMessage = document.getElementById("loading-message");

  exibirMensagem("user", pergunta);
  input.value = "";

  loadingMessage.classList.remove("hidden");
  const chat = document.getElementById("chat-container");
  chat.scrollTop = chat.scrollHeight;

  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/IA", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta })
    });

    if (!res.ok) throw new Error("Erro na requisição");

    const data = await res.json();
    exibirMensagem("bot", data.resposta);
  } catch (e) {
    console.error(e);
    exibirMensagem("bot", "Erro ao consultar a API.");
  } finally {
    loadingMessage.classList.add("hidden");
    chat.scrollTop = chat.scrollHeight;
  }
}

export function exibirMensagem(remetente, texto) {
  const chat = document.getElementById("chat-container");
  const msg = document.createElement("div");

  msg.className = remetente === "user"
    ? "bg-blue-600 text-white px-3 py-2 rounded-lg self-end max-w-3xl ml-auto"
    : "bg-gray-700 text-white px-3 py-2 rounded-lg self-start max-w-3xl";

  if (remetente === "bot") {
    const content = document.createElement("div");

    const nomeAssistente = document.createElement("span");
    nomeAssistente.textContent = "Skynet: ";
    nomeAssistente.style.fontWeight = "bold";
    content.appendChild(nomeAssistente);

    const respostaFormatada = document.createElement("span");
    respostaFormatada.innerHTML = marked.parse(texto);
    content.appendChild(respostaFormatada);

    msg.appendChild(content);
  } else {
    msg.textContent = texto;
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}
