function abrirArquivoRTF() {
  document.getElementById('arquivoRTF').click();
}
document.getElementById("toggleLiberacoes").addEventListener("click", function () {
  const div = document.getElementById("verificarLiberacoes");
  if (div.style.display === "none") {
    div.style.display = "block";
    this.textContent = "📂 Ocultar liberações ▲";
    abrirArquivoRTF();
  } else {
    div.style.display = "none";
    this.textContent = "📂 Mostrar liberações ▼";
  }
});

function mostrarLiberacoes() {
  const liberacoes = document.getElementById("liberacoes-container");
  const icone = document.getElementById("icon-toggle-liberacoes");
  const texto = document.querySelector('[onclick="mostrarLiberacoes()"] span');

  liberacoes.classList.toggle("hidden");

  if (liberacoes.classList.contains("hidden")) {
    icone.className = "fas fa-chevron-down icon";
    texto.textContent = "📂 Verificar liberações";
    abrirArquivoRTF();
  } else {
    icone.className = "fas fa-chevron-up icon";
    texto.textContent = "📂 Ocultar liberações";
  }
}

async function obterListaPRTs() {
  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/protocolos");
    const registros = await res.json();

    // Retorna objetos com prt, ticket e link
    const listaPRTs = registros
      .filter(reg => reg.prt) // filtra só os registros válidos
      .map(reg => ({
        protocolo: reg.prt.replace('#PRT', ''),
        ticket: reg.ticket || '',
        link: reg.link || ''
      }));

    return listaPRTs;
  } catch (err) {
    console.error("Erro ao carregar registros da API:", err);
    return [];
  }
};

function processarRTF(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) {
    console.warn("Nenhum arquivo selecionado.");
    return;
  }

  const reader = new FileReader();

  reader.onload = async function (e) {
    const texto = e.target.result;

    const protocolosLocalizados = [...texto.matchAll(/Protocolo:\s*(\d+)/g)].map(m => m[1]);
    const encontrados = [...new Set(protocolosLocalizados)];
    const historicoPRTs = await obterListaPRTs();

    const resultados = encontrados.map(protocolo => {
      const registro = historicoPRTs.find(reg => reg.protocolo === protocolo);
      return {
        protocolo,
        ticket: registro?.ticket || '',
        link: registro?.link || '',
        estaRegistrado: !!registro
      };
    });

    const container = document.getElementById('liberacoes-container');
    container.innerHTML = ""; // Limpa tudo antes

    const encontradosRegistrados = resultados.filter(r => r.estaRegistrado);

    if (encontradosRegistrados.length) {
      renderizarLiberacoes(encontradosRegistrados);
    } else {
      container.innerHTML = '<p style="color: red; font-weight: bold;">Nenhum dos protocolos registrados no ProtoCord foi liberado no release selecionado!</p>';
    }
  };

  reader.readAsText(arquivo);
}

function renderizarLiberacoes(registros) {
  const container = document.querySelector("#liberacoes-container");

  const tabela = document.createElement("table");
  tabela.classList.add("tabela-comum");

  tabela.innerHTML = `
    <thead>
      <tr>
        <th>Protocolo</th>
        <th>Ticket</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = tabela.querySelector("tbody");

  registros.forEach(reg => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>#PRT${reg.protocolo}</td>
      <td><a href="${reg.link}" target="_blank">${reg.ticket}</a></td>
    `;

    tbody.appendChild(tr);
  });

  container.appendChild(tabela);
}
