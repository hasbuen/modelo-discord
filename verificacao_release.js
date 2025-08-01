function abrirArquivoRTF() {
  document.getElementById('arquivoRTF').click();
}

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

    // Extrai todos os protocolos encontrados
    const protocolosLocalizados = [...texto.matchAll(/Protocolo:\s*(\d+)/g)].map(m => m[1]);
    const encontrados = [...new Set(protocolosLocalizados)];
    console.table(encontrados);

    // Busca os registros completos da API (protocolo, ticket, link)
    const historicoPRTs = await obterListaPRTs();
    console.table(historicoPRTs);

    // Associa os protocolos encontrados aos dados vindos da API
    const resultados = encontrados.map(protocolo => {
      const registro = historicoPRTs.find(reg => reg.protocolo === protocolo);

      return {
        protocolo,
        ticket: registro?.ticket || '',
        link: registro?.link || '',
        estaRegistrado: !!registro
      };
    });

    // === Renderiza o resultado ===
    const container = document.getElementById('liberacoes-container');
    let html = '';

    const encontradosRegistrados = resultados.filter(r => r.estaRegistrado);

    if (encontradosRegistrados.length) {
      html += '<table><tr><th style="text-align: left; padding: 6px;">Protocolo</th><th style="text-align: left; padding: 6px;">Ticket</th></tr>';
      encontradosRegistrados.forEach(r => {
        html += `
          <tr>
            <td style="padding: 6px;">#PRT${r.protocolo}</td>
            <td style="padding: 6px;"><a href="${r.link}" target="_blank">${r.ticket}</a></td>
          </tr>
        `;
      });
      html += '</table>';
    } else {
      html = '<p style="color: red; font-weight: bold;">Nenhum dos protocolos registrados no ProtoCord foi liberado no release selecionado!</p>';
    }

    container.innerHTML = html;
  };

  reader.readAsText(arquivo);
}
