// A URL da sua API na Vercel para buscar os protocolos.
// Substitua 'SEU_PROJETO.vercel.app' pela URL real do seu projeto.
const API_SERVER = "https://modelo-discord-server.vercel.app";

// Intenções e respostas (copiadas dos seus arquivos intents.js e responses.js)
const intents = {
  greeting: ["olá", "oi", "bom dia", "boa tarde", "e aí"],
  farewell: ["tchau", "até mais", "adeus"],
  security: ["protocolos de segurança", "tratamento seguro", "segurança de dados"],
  billing: ["faturamento", "cobrança", "pagamento", "financeiro"],
  module_future: ["módulo futuramente", "implementações futuras", "novos módulos"]
};

const responses = {
  greeting: "Olá! Como posso te ajudar hoje?",
  farewell: "Até mais! Fico à disposição.",
  security: "Os protocolos de segurança envolvem criptografia, controle de acesso e auditoria.",
  billing: "O módulo de faturamento permite gerar cobranças, notas fiscais e relatórios financeiros.",
  module_future: "Estamos desenvolvendo novos módulos com foco em segurança e integração futura."
};

// Variáveis e elementos DOM
let useModel = null;
let protocolos = [];
let protocoloEmbeddings = [];
let protocoloModules = [];
let protocoloFieldsToIndex = ["descricao", "contexto", "tipo", "prt", "modulo", "link"];

const chatEl = document.getElementById("chat");
const statusEl = document.getElementById("status");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Garante eventos
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keyup", (e) => {
  if (e.key === "Enter") sendMessage();
});

function addMessage(sender, text, type = "bot") {
  const p = document.createElement("div");
  p.className = `message ${type}`;
  p.innerHTML = `<div class="meta"><strong>${sender}</strong></div><div>${text}</div>`;
  chatEl.appendChild(p);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Normaliza texto
function normalize(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ==============================
// Load modelo + dados
// ==============================
async function loadModelAndData() {
  try {
    statusEl.textContent = "Carregando TensorFlow.js...";

    // Força usar CPU para evitar erros de WebGL
    await tf.setBackend('cpu');
    await tf.ready();

    statusEl.textContent = "Carregando Universal Sentence Encoder...";
    
    try {
      // O modelo USE é carregado via CDN no frontend
      useModel = await use.load();
    } catch (modelErr) {
      console.error("Erro ao carregar o modelo USE:", modelErr);
      statusEl.textContent = "⚠️ Erro ao carregar o modelo. Verifique sua conexão ou tente novamente.";
      return;
    }
    
    // As intenções e respostas agora estão embutidas no código.
    // Não há necessidade de chamadas `fetch` para elas.
    
    await fetchAndIndexProtocols();
    statusEl.textContent = "✅ Pronto — pergunte algo!";
  } catch (err) {
    console.error("Erro geral ao carregar modelo/dados:", err);
    addMessage(
      "Bot",
      "⚠️ Não consegui carregar os dados no momento. Você ainda pode tentar perguntar.",
      "bot"
    );
    statusEl.textContent = "Carregamento parcial — algumas funções podem não estar disponíveis.";
  }
}

async function fetchAndIndexProtocols() {
  try {
    // Busca os protocolos diretamente da API Vercel
    const res = await fetch(`${API_SERVER}/api/protocolos`);
    const data = await res.json();

    // A API Vercel retorna a lista de protocolos diretamente
    protocolos = Array.isArray(data) ? data : (data?.data || []);
    console.log("Protocolos recebidos:", protocolos);

    if (!protocolos || protocolos.length === 0) {
      statusEl.textContent = "⚠️ Nenhum protocolo encontrado.";
      return;
    }

    const docs = protocolos.map(p =>
      protocoloFieldsToIndex.map(f => (p?.[f] || "")).filter(Boolean).join(" · ")
    );
    console.log("Docs gerados:", docs);

    if (!docs.length || docs.every(d => d.trim() === "")) {
      statusEl.textContent = "⚠️ Nenhum dado válido para indexar.";
      return;
    }

    const embeddings = await useModel.embed(docs);
    protocoloEmbeddings = await embeddings.array();
    protocoloModules = protocolos.map(p => normalize(p.modulo || p.tipo || p.prt || ""));
    statusEl.textContent = `Indexação concluída: ${protocolos.length} protocolos.`;
  } catch (err) {
    console.error("Erro ao buscar/indexar protocolos:", err);
    statusEl.textContent = "Erro ao carregar protocolos.";
  }
}

// ==============================
// Similaridade
// ==============================
function cosineSimilarity(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ==============================
// Bot response
// ==============================
async function getBotResponse(userInput) {
  const normalized = normalize(userInput);

  // Intents simples (agora embutidas no código)
  for (const [intent, examples] of Object.entries(intents)) {
    for (const ex of examples) {
      if (normalized.includes(normalize(ex))) {
        return { text: responses[intent], meta: { source: "intent", intent } };
      }
    }
  }

  // Embeddings
  const inEmbedTensor = await useModel.embed([userInput]);
  const inEmbedArr = (await inEmbedTensor.array())[0];

  const sims = protocoloEmbeddings
    .map((vec, i) => ({
      index: i,
      score: cosineSimilarity(inEmbedArr, vec),
    }))
    .sort((a, b) => b.score - a.score);

  const matched = sims
    .filter((s) => s.score >= 0.45)
    .slice(0, 5)
    .map((s) => protocolos[s.index]);

  if (matched.length > 0) {
    const list = matched
      .map((m) => `• ${m.descricao || m.prt || "(sem título)"}`)
      .join("\n");
    return { text: `🔎 Protocolos relacionados:\n${list}`, meta: { source: "protocolos" } };
  }

  return {
    text: "Não encontrei nada relacionado. Pode reformular?",
    meta: { source: "fallback" },
  };
}

// ==============================
// Chat
// ==============================
async function sendMessage() {
  const input = inputEl.value.trim();
  if (!input) return;

  console.log("Enviando pergunta:", input);

  addMessage("Você", input, "user");
  inputEl.value = "";
  addMessage("Bot", "<em>processando...</em>", "bot");

  const placeholder = chatEl.lastElementChild;

  try {
    const resp = await getBotResponse(input);

    if (placeholder) chatEl.removeChild(placeholder);
    addMessage("Bot", resp.text, "bot");

    // A rota /historico não existe mais na sua API Vercel,
    // então a chamada a seguir causará um erro 404.
    // Você pode remover ou comentar este trecho para evitar o erro.
    // await fetch(`${API_SERVER}/historico`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ pergunta: input, resposta: resp.text }),
    // });
  } catch (err) {
    console.error("Erro no sendMessage:", err);
    if (placeholder) chatEl.removeChild(placeholder);
    addMessage("Bot", `⚠️ Erro ao processar a mensagem: ${err.message}`, "bot");
  }
}

// start
loadModelAndData();
