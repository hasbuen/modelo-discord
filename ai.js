const API_SERVER = "https://modelo-discord-server.vercel.app";

// Intents básicas
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

// Variáveis
let useModel = null;
let protocolos = [];
let protocoloEmbeddings = [];
let protocoloModules = [];
let protocoloFieldsToIndex = ["descricao", "contexto", "tipo", "prt", "modulo", "link"];

const chatEl = document.getElementById("chat");
const statusEl = document.getElementById("status");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Eventos
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keyup", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Add mensagem no chat
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
// Load modelo + dados (em paralelo)
// ==============================
async function loadModelAndData() {
  try {
    statusEl.textContent = "Iniciando núcleo de IA...";

    // Carrega modelo e protocolos ao mesmo tempo
    const [model, protos] = await Promise.all([
      (async () => {
        await tf.setBackend('cpu');
        await tf.ready();
        return await use.load();
      })(),
      fetchAndIndexProtocols()
    ]);

    useModel = model;

    statusEl.textContent = "✅ IA carregada — pergunte algo!";
    inputEl.disabled = false;
    sendBtn.disabled = false;
  } catch (err) {
    statusEl.textContent = "Erro ao carregar IA.";
    console.error(err);
  }
}

async function fetchAndIndexProtocols() {
  try {
    statusEl.textContent = "Baixando protocolos...";
    const res = await fetch(`${API_SERVER}/api/protocolos`);
    const data = await res.json();

    protocolos = Array.isArray(data) ? data : (data?.data || []);
    if (!protocolos.length) {
      statusEl.textContent = "⚠️ Nenhum protocolo encontrado.";
      return;
    }

    // Gera textos para embutir
    const docs = protocolos.map(p =>
      protocoloFieldsToIndex.map(f => (p?.[f] || "")).filter(Boolean).join(" · ")
    );

    if (!docs.length) {
      statusEl.textContent = "⚠️ Nenhum dado válido para indexar.";
      return;
    }

    // Embedding direto (sem pausas artificiais)
    const embeddings = await use.load().then(m => m.embed(docs));
    protocoloEmbeddings = await embeddings.array();
    protocoloModules = protocolos.map(p => normalize(p.modulo || p.tipo || p.prt || ""));

    statusEl.textContent = `📂 Protocolos indexados: ${protocolos.length}`;
  } catch (err) {
    console.error("Erro ao buscar protocolos:", err);
    statusEl.textContent = "Erro ao carregar protocolos.";
  }
}

// ==============================
// Similaridade
// ==============================
function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// ==============================
// Bot response
// ==============================
async function getBotResponse(userInput) {
  const normalized = normalize(userInput);

  // Primeiro checa intents
  for (const [intent, examples] of Object.entries(intents)) {
    for (const ex of examples) {
      if (normalized.includes(normalize(ex))) {
        return { text: responses[intent], meta: { source: "intent", intent } };
      }
    }
  }

  // Se não tem modelo ou embeddings
  if (!useModel || protocoloEmbeddings.length === 0) {
    return {
      text: "Ainda estou inicializando, tente novamente em instantes.",
      meta: { source: "fallback_no_model" }
    };
  }

  // Calcula embedding da pergunta
  const inEmbedTensor = await useModel.embed([userInput]);
  const inEmbedArr = (await inEmbedTensor.array())[0];

  const sims = protocoloEmbeddings
    .map((vec, i) => ({ index: i, score: cosineSimilarity(inEmbedArr, vec) }))
    .sort((a, b) => b.score - a.score);

  const matched = sims.filter(s => s.score >= 0.7).slice(0, 5).map(s => protocolos[s.index]);

  if (matched.length > 0) {
    return {
      text: formatProtocols(matched),
      meta: { source: "protocolos" }
    };
  }

  // 🔹 Fallback mais natural
  return {
    text: `🤔 Não encontrei nada específico sobre "${userInput}". Mas posso tentar entender melhor: está relacionado a protocolos, segurança ou faturamento?`,
    meta: { source: "fallback" }
  };
}

// ==============================
// Formata resposta com protocolos
// ==============================
function formatProtocols(matchedProtocols) {
  let html = "<b>🌐 Protocolos relacionados:</b><br><br><ul>";
  matchedProtocols.forEach(p => {
    const descricao = p.descricao || "(sem descrição)";
    const prt = p.prt ? `(${p.prt})` : "";
    const link = p.link ? `<a href="${p.link}" target="_blank">🔗 Acessar</a>` : "";
    html += `<li><b>${descricao} ${prt}</b><br><small>${p.contexto || ""}</small><br>${link}</li>`;
  });
  html += "</ul>";
  return html;
}

// ==============================
// Chat
// ==============================
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
    addMessage("Skynet", `⚠️ Erro: ${err.message}`, "bot");
  }
}

// Inicia
loadModelAndData();
