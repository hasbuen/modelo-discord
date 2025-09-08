const API_SERVER = "https://modelo-discord-server.vercel.app";

// Intents
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

// garante eventos
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

// normaliza texto
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
    statusEl.textContent = "Iniciando a inteligência...";
    await tf.setBackend("cpu");
    await tf.ready();

    statusEl.textContent = "Carregando o núcleo do pensamento...";
    useModel = await use.load();

    statusEl.textContent = "Sincronizando com o banco de dados de protocolos...";
    await fetchAndIndexProtocols();

    statusEl.textContent = "✅ Pronto — pergunte algo!";
    inputEl.disabled = false;
    sendBtn.disabled = false;
  } catch (err) {
    console.error("Erro no loadModelAndData:", err);
    statusEl.textContent = "Erro ao carregar IA.";
  }
}

async function fetchAndIndexProtocols() {
  try {
    const res = await fetch(`${API_SERVER}/api/protocolos`);
    const data = await res.json();

    protocolos = Array.isArray(data) ? data : (data?.data || []);
    if (!protocolos || protocolos.length === 0) {
      statusEl.textContent = "⚠️ Nenhum protocolo encontrado.";
      return;
    }

    const docs = protocolos.map(p =>
      protocoloFieldsToIndex.map(f => (p?.[f] || "")).filter(Boolean).join(" · ")
    );

    if (!docs.length || docs.every(d => d.trim() === "")) {
      statusEl.textContent = "⚠️ Nenhum dado válido para indexar.";
      return;
    }

    const batchSize = 25; // 🔹 maior lote para processar mais rápido
    const totalBatches = Math.ceil(docs.length / batchSize);
    const allEmbeddings = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batchDocs = docs.slice(start, end);

      const batchEmbeddings = await useModel.embed(batchDocs);
      allEmbeddings.push(...(await batchEmbeddings.array()));

      const percent = Math.floor(((i + 1) / totalBatches) * 100);
      statusEl.textContent = `Indexando protocolos... ${percent}%`;
      document.title = `ProtoCord (${percent}%)`;

      await new Promise(resolve => setTimeout(resolve, 0)); // 🔹 libera UI
    }

    protocoloEmbeddings = allEmbeddings;
    protocoloModules = protocolos.map(p => normalize(p.modulo || p.tipo || p.prt || ""));
    statusEl.textContent = `📂 Indexação concluída: ${protocolos.length} protocolos.`;
    document.title = "ProtoCord";
  } catch (err) {
    console.error("Erro fetchAndIndexProtocols:", err);
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

  // 🔹 Intents rápidos primeiro
  for (const [intent, examples] of Object.entries(intents)) {
    if (examples.some(ex => normalized.includes(normalize(ex)))) {
      return { text: responses[intent], meta: { source: "intent", intent } };
    }
  }

  // 🔹 Sem modelo ou embeddings
  if (!useModel || protocoloEmbeddings.length === 0) {
    return {
      text: "Ainda estou inicializando, mas posso ajudar com dúvidas gerais! 🤖",
      meta: { source: "fallback_no_model" }
    };
  }

  // 🔹 Similaridade semântica
  const inEmbedTensor = await useModel.embed([userInput]);
  const inEmbedArr = (await inEmbedTensor.array())[0];

  const sims = protocoloEmbeddings
    .map((vec, i) => ({ index: i, score: cosineSimilarity(inEmbedArr, vec) }))
    .sort((a, b) => b.score - a.score);

  const matched = sims.filter(s => s.score >= 0.7).slice(0, 5).map(s => protocolos[s.index]);

  if (matched.length > 0) {
    return { text: formatProtocols(matched), meta: { source: "protocolos" } };
  }

  // 🔹 Fallback mais natural, estilo IA
  return {
    text: `🤔 Não encontrei nada específico sobre "${userInput}". Mas posso tentar ajudar se você reformular a pergunta ou detalhar um pouco mais.`,
    meta: { source: "fallback" }
  };
}

// ==============================
// Formata protocolos
// ==============================
function formatProtocols(matchedProtocols) {
  if (!matchedProtocols.length) {
    return "Não encontrei protocolos relacionados.";
  }

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
    addMessage("Skynet", `⚠️ Erro ao processar a mensagem: ${err.message}`, "bot");
  }
}
