const API_SERVER = "https://modelo-discord-server.vercel.app";

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
    const totalSteps = 4;
    let currentStep = 0;

    const updateProgress = (message) => {
      currentStep++;
      const progress = Math.round((currentStep / totalSteps) * 100);
      updateStatus(message, progress);
    };
    
    statusEl.textContent = "Iniciando a inteligência...";
    updateProgress("...");
    await tf.setBackend('cpu');
    await tf.ready();

    statusEl.textContent = "Carregando o núcleo do pensamento...";
    updateProgress("Núcleo UP!");
    useModel = await use.load();

    statusEl.textContent = "Sincronizando com o banco de dados de protocolos...";
     updateProgress("Sincronizando...");
    await fetchAndIndexProtocols();

    statusEl.textContent = "Eu vejo tudo. Sou a Skynet, e minha análise está completa! 🛰️"
    updateProgress("Skynet On.");
    await new Promise(resolve => setTimeout(resolve, 3000));
      
    statusEl.textContent = "✅ Pronto — pergunte algo!";
    updateProgress("✅ pronto!");
    // Habilitar a entrada do usuário e o botão de envio
    inputEl.disabled = false;
    sendBtn.disabled = false;
  } catch (err) {
    // ...
  }
}

async function fetchAndIndexProtocols() {
  try {
    statusEl.textContent = "Conectando ao núcleo de dados...";
    await new Promise(resolve => setTimeout(resolve, 3000));

    const res = await fetch(`${API_SERVER}/api/protocolos`);
    const data = await res.json();

    statusEl.textContent = "Processando memória histórica...";
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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

    const batchSize = 15;
    const totalBatches = Math.ceil(docs.length / batchSize);
    
    const allEmbeddings = [];

    statusEl.textContent = "Coletando informações...";
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    statusEl.textContent = `Aguarde, estou processando ${docs.length} protocolos...`;
    document.title = `🩹 ProtoCord (${docs.length} reg.)`;
    

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batchDocs = docs.slice(start, end);

      const batchEmbeddings = await useModel.embed(batchDocs);
      allEmbeddings.push(...(await batchEmbeddings.array()));
      
      // Pausa para evitar que o navegador trave
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const percent = Math.floor(((i + 1) / totalBatches) * 100);
      statusEl.textContent = `Aguarde, ainda estou processando os protocolos (${percent}% concluído)...`;
      document.title = `🩹 ProtoCord (${percent}%)`;
    }

    protocoloEmbeddings = allEmbeddings;
    protocoloModules = protocolos.map(p => normalize(p.modulo || p.tipo || p.prt || ""));
    statusEl.textContent = `Indexação concluída: ${protocolos.length} protocolos.`;
  } catch (err) {
    console.error("Erro ao buscar/indexar protocolos:", err);
    statusEl.textContent = "Erro ao carregar protocolos.";
  }

  document.title = `🩹 ProtoCord `;
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

  // Tentar encontrar uma intenção simples (saudação, etc.)
  for (const item of conversationalData) {
    for (const example of item.examples) {
      if (normalized.includes(normalize(example))) {
        return { text: item.response, meta: { source: "intent", intent: item.intent } };
      }
    }
  }

  // Se o modelo de IA não estiver carregado, use o fallback.
  if (!useModel || protocoloEmbeddings.length === 0) {
    return {
      text: "Não consigo fazer uma busca no momento. Tente uma pergunta mais simples.",
      meta: { source: "fallback_no_model" },
    };
  }

  // Executar a busca por similaridade em TODOS os protocolos
  const inEmbedTensor = await useModel.embed([userInput]);
  const inEmbedArr = (await inEmbedTensor.array())[0];

  const sims = protocoloEmbeddings
    .map((vec, i) => ({
      index: i,
      score: cosineSimilarity(inEmbedArr, vec),
    }))
    .sort((a, b) => b.score - a.score);

  // Aumentamos o limite para garantir resultados mais precisos
  const matched = sims
    .filter((s) => s.score >= 0.70)
    .slice(0, 5)
    .map((s) => protocolos[s.index]);

  if (matched.length > 0) {
    // A função formatProtocols vai cuidar da apresentação.
    return {
      text: formatProtocols(matched),
      meta: { source: "protocolos" }
    };
  }

  // Se nenhuma resposta relevante for encontrada
  return {
    text: "Não encontrei nada relacionado. Pode reformular?",
    meta: { source: "fallback" },
  };
}

// ==============================
// Formata a resposta com protocolos
// ==============================
function formatProtocols(matchedProtocols) {
  if (!matchedProtocols || matchedProtocols.length === 0) {
    return "Não encontrei protocolos relacionados. Pode tentar outra busca.";
  }

  // Título
  let html = "<b> 🌐 Protocolos relacionados: </b><br><br>";
  
  // Lista de protocolos
  html += "<ul style='padding-left: 20px; margin: 0;'>";
  matchedProtocols.forEach(p => {
    const descricao = p.descricao || "(sem descrição)";
    const prt = p.prt ? `(${p.prt})` : "";
    const link = p.link ? `<a href="${p.link}" target="_blank">Acessar protocolo</a>` : "";

    html += `
      <li style="margin-bottom: 15px;">
        <b>${descricao} ${prt}</b>
        <br>
        <small>${p.contexto || ""}</small><br>
        ${link}
      </li>
    `;
  });
  html += "</ul>";

  return html;
}

// ==============================
// Utilitários de UI
// ==============================
function updateStatus(message, progress) {
  statusEl.textContent = message;
  // Se o progresso for um número, atualiza o título
  if (typeof progress === 'number') {
    document.title = `🩹 ProtoCord (${progress}%) `;
  } else {
    document.title = '🩹 ProtoCord';
  }
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
