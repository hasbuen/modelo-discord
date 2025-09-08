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

// ==============================
// Mensagens (agora com histórico salvo)
// ==============================
function addMessage(sender, text, type = "bot") {
  const p = document.createElement("div");
  p.className = `message ${type}`;
  p.innerHTML = `<div class="meta"><strong>${sender}</strong></div><div>${text}</div>`;
  chatEl.appendChild(p);
  chatEl.scrollTop = chatEl.scrollHeight;

  // 🔹 Salva histórico no localStorage
  let history = JSON.parse(localStorage.getItem("chat_history") || "[]");
  history.push({ sender, text, type });
  localStorage.setItem("chat_history", JSON.stringify(history));
}

// 🔹 Carregar histórico ao abrir
function loadChatHistory() {
  const history = JSON.parse(localStorage.getItem("chat_history") || "[]");
  history.forEach(msg => addMessage(msg.sender, msg.text, msg.type));
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

    // 🔹 Tenta carregar do localStorage
    const cache = localStorage.getItem("protocol_cache");
    if (cache) {
      const parsed = JSON.parse(cache);
      protocolos = parsed.protocolos || [];
      protocoloEmbeddings = parsed.embeddings || [];
      protocoloModules = parsed.modules || [];
      statusEl.textContent = `📂 Indexação carregada do cache: ${protocolos.length} protocolos.`;
      inputEl.disabled = false;
      sendBtn.disabled = false;
      return;
    }

    // 🔹 Se não houver cache → busca e indexa
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

    // 🔹 Salva no cache (localStorage)
    localStorage.setItem("protocol_cache", JSON.stringify({
      protocolos,
      embeddings: protocoloEmbeddings,
      modules: protocoloModules
    }));
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
// ==============================
// Bot response (melhorado)
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

  // 🔹 Similaridade semântica adaptativa
  const inEmbedTensor = await useModel.embed([userInput]);
  const inEmbedArr = (await inEmbedTensor.array())[0];

  const sims = protocoloEmbeddings
    .map((vec, i) => ({ index: i, score: cosineSimilarity(inEmbedArr, vec) }))
    .sort((a, b) => b.score - a.score);

  // tenta thresholds diferentes
  let matched = sims.filter(s => s.score >= 0.7).slice(0, 5);
  if (matched.length === 0) matched = sims.filter(s => s.score >= 0.6).slice(0, 3);
  if (matched.length === 0) matched = sims.filter(s => s.score >= 0.5).slice(0, 2);

  if (matched.length > 0) {
    const protocolosMatch = matched.map(s => protocolos[s.index]);
    let resposta = formatProtocols(protocolosMatch);

    // 🔹 Se a confiança for baixa (<0.65), adiciona aviso estilo IA
    if (matched[0].score < 0.65) {
      resposta = `🤔 Não encontrei nada exatamente igual ao que você perguntou, mas talvez isso ajude:<br><br>${resposta}`;
    }

    return { text: resposta, meta: { source: "protocolos" } };
  }

  // 🔹 Fallback mais inteligente por palavras-chave
  if (normalized.includes("nota fiscal")) {
    return { text: responses.billing, meta: { source: "keyword_fallback" } };
  }
  if (normalized.includes("segurança")) {
    return { text: responses.security, meta: { source: "keyword_fallback" } };
  }

  // 🔹 Fallback final mais humano
  return {
    text: `🤖 Eu não achei nada muito específico sobre "${userInput}". Pode detalhar melhor? Talvez eu consiga relacionar com algum protocolo.`,
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

// 🔹 Carregar histórico automaticamente ao abrir
loadChatHistory();
