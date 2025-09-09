// js/model.js
function normalize(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function loadModelAndData() {
  try {
    statusEl.textContent = "Iniciando a inteligência...";
    await tf.setBackend("cpu");
    await tf.ready();

    statusEl.textContent = "Carregando o núcleo do pensamento...";
    useModel = await use.load();

    statusEl.textContent = "Sincronizando com o banco de dados de protocolos...";

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
    if (!protocolos.length) {
      statusEl.textContent = "⚠️ Nenhum protocolo encontrado.";
      return;
    }

    const docs = protocolos.map(p =>
      protocoloFieldsToIndex.map(f => (p?.[f] || "")).filter(Boolean).join(" · ")
    );

    const batchSize = 25;
    const totalBatches = Math.ceil(docs.length / batchSize);
    const allEmbeddings = [];

    for (let i = 0; i < totalBatches; i++) {
      const batchDocs = docs.slice(i * batchSize, (i + 1) * batchSize);
      const batchEmbeddings = await useModel.embed(batchDocs);
      allEmbeddings.push(...(await batchEmbeddings.array()));

      const percent = Math.floor(((i + 1) / totalBatches) * 100);
      statusEl.textContent = `Indexando protocolos... ${percent}%`;
      document.title = `ProtoCord (${percent}%)`;
      await new Promise(r => setTimeout(r, 0));
    }

    protocoloEmbeddings = allEmbeddings;
    protocoloModules = protocolos.map(p => normalize(p.modulo || p.tipo || p.prt || ""));
    statusEl.textContent = `📂 Indexação concluída: ${protocolos.length} protocolos.`;
    document.title = "ProtoCord";

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
