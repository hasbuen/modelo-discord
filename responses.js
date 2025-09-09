// js/responses.js
async function getBotResponse(userInput) {
  const normalized = normalize(userInput);

  for (const [intent, examples] of Object.entries(intents)) {
    if (examples.some(ex => normalized.includes(normalize(ex)))) {
      return { text: responses[intent], meta: { source: "intent", intent } };
    }
  }

  if (!useModel || protocoloEmbeddings.length === 0) {
    return { text: "Ainda estou inicializando, mas posso ajudar com dúvidas gerais! 🤖" };
  }

  const inEmbedTensor = await useModel.embed([userInput]);
  const inEmbedArr = (await inEmbedTensor.array())[0];

  const sims = protocoloEmbeddings
    .map((vec, i) => ({ index: i, score: cosineSimilarity(inEmbedArr, vec) }))
    .sort((a, b) => b.score - a.score);

  let matched = sims.filter(s => s.score >= 0.7).slice(0, 5);
  if (!matched.length) matched = sims.filter(s => s.score >= 0.6).slice(0, 3);
  if (!matched.length) matched = sims.filter(s => s.score >= 0.5).slice(0, 2);

  if (matched.length) {
    let resposta = formatProtocols(matched.map(s => protocolos[s.index]));
    if (matched[0].score < 0.65) {
      resposta = `🤔 Não encontrei
