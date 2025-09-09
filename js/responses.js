// js/responses.js
async function getBotResponse(userInput) {
  const normalized = normalize(userInput);

  // 🔹 Checa intents rápidas
  for (const [intent, examples] of Object.entries(intents)) {
    if (examples.some(ex => normalized.includes(normalize(ex)))) {
      return { text: responses[intent], meta: { source: "intent", intent } };
    }
  }

  // 🔹 Se o modelo ainda não carregou
  if (!useModel || protocoloEmbeddings.length === 0) {
    return { text: "Ainda estou inicializando, mas posso ajudar com dúvidas gerais! 🤖" };
  }

  // 🔹 Gera embedding da entrada
  const inEmbedTensor = await useModel.embed([userInput]);
  const inEmbedArr = (await inEmbedTensor.array())[0];

  // 🔹 Calcula similaridade com protocolos
  const sims = protocoloEmbeddings
    .map((vec, i) => ({ index: i, score: cosineSimilarity(inEmbedArr, vec) }))
    .sort((a, b) => b.score - a.score);

  // 🔹 Seleciona melhores matches com thresholds adaptativos
  let matched = sims.filter(s => s.score >= 0.7).slice(0, 5);
  if (!matched.length) matched = sims.filter(s => s.score >= 0.6).slice(0, 3);
  if (!matched.length) matched = sims.filter(s => s.score >= 0.5).slice(0, 2);

  if (matched.length) {
    let resposta = formatProtocols(matched.map(s => protocolos[s.index]));

    // Se a confiança for baixa, adiciona aviso
    if (matched[0].score < 0.65) {
      resposta = `🤔 Não encontrei nada exatamente igual ao que você perguntou, mas talvez isso ajude:<br><br>${resposta}`;
    }

    return { text: resposta, meta: { source: "protocolos" } };
  }

  // 🔹 Fallback por palavra-chave
  if (normalized.includes("nota fiscal")) {
    return { text: responses.billing, meta: { source: "keyword_fallback" } };
  }
  if (normalized.includes("segurança")) {
    return { text: responses.security, meta: { source: "keyword_fallback" } };
  }

  // 🔹 Fallback final
  return {
    text: `🤖 Eu não achei nada muito específico sobre "${userInput}". Pode detalhar melhor? Talvez eu consiga relacionar com algum protocolo.`,
    meta: { source: "fallback" }
  };
}
