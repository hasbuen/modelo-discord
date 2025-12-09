// js/history.js
function addMessage(sender, text, type = "bot") {
  const p = document.createElement("div");
  p.className = `message ${type}`;
  p.innerHTML = `<div class="meta"><strong>${sender}</strong></div><div>${text}</div>`;
  chatEl.appendChild(p);
  chatEl.scrollTop = chatEl.scrollHeight;

  let history = JSON.parse(localStorage.getItem("chat_history") || "[]");
  history.push({ sender, text, type });
  localStorage.setItem("chat_history", JSON.stringify(history));
}

function loadChatHistory() {
  const history = JSON.parse(localStorage.getItem("chat_history") || "[]");
  history.forEach(msg => addMessage(msg.sender, msg.text, msg.type));
}

function gerarDashboardLiberacoes() {
  const linhas = document.querySelectorAll("#tabelaLiberados tr");

  const releases = [];
  const protocolosPorRelease = {};
  let totalProtocolos = 0;

  linhas.forEach(linha => {
    const cols = linha.querySelectorAll("td");
    if (cols.length < 2) return;

    const release = cols[0].innerText.trim();
    const protocolos = cols[1].innerText.split(",").map(p => p.trim()).filter(p => p);

    releases.push(release);
    protocolosPorRelease[release] = protocolos.length;

    totalProtocolos += protocolos.length;
  });

  if (releases.length === 0) return;

  const media = (totalProtocolos / releases.length).toFixed(1);

  // ==== CARDS ====
  document.getElementById("dashboard-liberacoes").innerHTML = `
    <div class="bg-gray-900 p-4 rounded-xl text-center">
      <h3 class="text-gray-400">Total de Releases</h3>
      <p class="text-3xl font-bold text-white">${releases.length}</p>
    </div>

    <div class="bg-gray-900 p-4 rounded-xl text-center">
      <h3 class="text-gray-400">Total de Protocolos</h3>
      <p class="text-3xl font-bold text-white">${totalProtocolos}</p>
    </div>

    <div class="bg-gray-900 p-4 rounded-xl text-center">
      <h3 class="text-gray-400">Média por Release</h3>
      <p class="text-3xl font-bold text-white">${media}</p>
    </div>
  `;

  // ==== GRÁFICO DE BARRAS ====
  new Chart(document.getElementById("graficoLiberacoes"), {
    type: "bar",
    data: {
      labels: releases,
      datasets: [{
        label: "Protocolos por Release",
        data: Object.values(protocolosPorRelease)
      }]
    }
  });

  // ==== GRÁFICO DE PIZZA ====
  new Chart(document.getElementById("graficoProporcao"), {
    type: "pie",
    data: {
      labels: releases,
      datasets: [{
        data: Object.values(protocolosPorRelease)
      }]
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  gerarDashboardLiberacoes();
});

