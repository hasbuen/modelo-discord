// A URL da sua API na Vercel para buscar os protocolos.
const API_SERVER = "https://modelo-discord-server.vercel.app";

// Intenções e respostas (agora embutidas diretamente no frontend)
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
// no arquivo ai.js (ou script.js)
async function loadModelAndData() {
  try {
    statusEl.textContent = "Iniciando a inteligência...";
    await tf.setBackend('cpu');
    await tf.ready();

    statusEl.textContent = "Carregando o núcleo do pensamento...";
    useModel = await use.load();

    statusEl.textContent = "Sincronizando com o banco de dados de protocolos...";
    await fetchAndIndexProtocols();

    statusEl.textContent = "Eu vejo tudo. Sou a Skynet, e minha análise está completa! 🛰️"
    await new Promise(resolve => setTimeout(resolve, 3000));
      
    statusEl.textContent = "✅ Pronto — pergunte algo!";
    // Habilitar a entrada do usuário e o botão de envio
    inputEl.disabled = false;
    sendBtn.disabled = false;
  } catch (err) {
    // ...
  }
}

// No seu arquivo ai.js (ou script.js)

async function fetchAndIndexProtocols() {
  try {
    statusEl.textContent = "Buscando protocolos na API...";

    const res = await fetch(`${API_SERVER}/api/protocolos`);
    const data = await res.json();
    
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

    const batchSize = 15;
    const totalBatches = Math.ceil(docs.length / batchSize);
    
    const allEmbeddings = [];
    
    statusEl.textContent = `Aguarde, estou processando ${docs.length} protocolos...`;

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batchDocs = docs.slice(start, end);

      const batchEmbeddings = await useModel.embed(batchDocs);
      allEmbeddings.push(...(await batchEmbeddings.array()));
      
      // Pausa para evitar que o navegador trave
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const percent = Math.floor(((i + 1) / totalBatches) * 100);
      statusEl.textContent = `Aguardando, ainda estou processando os protocolos (${percent}% concluído)...`;
    }

    protocoloEmbeddings = allEmbeddings;
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
  
  // intents simples
  for (const [intent, examples] of Object.entries(intents)) {
    for (const ex of examples) {
      if (normalized.includes(normalize(ex))) {
        return { text: responses[intent], meta: { source: "intent", intent } };
      }
    }
  }
  
  // embeddings
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
  
  addMessage("Você", input, "user");
  inputEl.value = "";
  addMessage("Skynet", "<em>processando...</em>", "bot");
  
  const placeholder = chatEl.lastElementChild;
  
  try {
    const resp = await getBotResponse(input);
    
    if (placeholder) chatEl.removeChild(placeholder);
    addMessage("Skynet", resp.text, "bot");
    
    // Removida a lógica de salvar histórico, pois não é suportada
    // na arquitetura atual.
  } catch (err) {
    console.error("Erro no sendMessage:", err);
    if (placeholder) chatEl.removeChild(placeholder);
    addMessage("Skynet", `⚠️ Erro ao processar a mensagem: ${err.message}`, "bot");
  }
}

// start
//loadModelAndData();
