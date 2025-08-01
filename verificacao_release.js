function abrirArquivoRTF() {
  document.getElementById('arquivoRTF').click();
}
document.getElementById("toggleLiberacoes").addEventListener("click", function () {
  const div = document.getElementById("verificarLiberacoes");
  if (div.style.display === "none") {
    div.style.display = "block";
    this.textContent = "📂 Ocultar liberações ▲";
  } else {
    div.style.display = "none";
    this.textContent = "📂 Mostrar liberações ▼";
    abrirArquivoRTF(); 
  }
});


document.getElementById("toggleLiberacoes").addEventListener("click", function () {
  document.getElementById("historico-container").style.display = "none";
  document.getElementById("liberacoes-container").style.display = "block";
  abrirArquivoRTF(); // Abre o seletor para .rtf
});

async function obterListaPRTs() {
  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/protocolos");
    const registros = await res.json();
    
    // Retorna objetos com prt, ticket e link
     const listaPRTs = registros
      .filter(reg => reg.prt) // filtra os registros válidos
      .map(reg => ({
        protocolo: reg.prt.replace('#PRT', ''),
        tipo: reg.tipo || '',
        ticket: reg.ticket || '',
        descricao: reg.descricao || '',
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
        ticket: registro?.tipo || '',
        ticket: registro?.ticket || '',
        ticket: registro?.descricao || '',
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
  tabela.classList.add("tabela-liberacoes");

  tabela.innerHTML = `
    <thead>
      <tr>
        <th>Ticket</th>
        <th>Protocolo</th>
        <th>Tipo</th>
        <th>descricao</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = tabela.querySelector("tbody");

  registros.forEach(reg => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><a href="${reg.link}" target="_blank">${reg.ticket}</a></td>
      <td>#PRT${reg.protocolo}</td>
      <td>${reg.tipo}</td>
      <td title="${reg.descricao}">${reg.descricao.slice(0, 40)}${reg.descricao.length > 40 ? '...' : ''}</td>
    `;

    tbody.appendChild(tr);
  });

  container.appendChild(tabela);
}
