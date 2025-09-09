// js/similarity.js
function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function formatProtocols(matchedProtocols) {
  if (!matchedProtocols.length) return "Não encontrei protocolos relacionados.";

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
