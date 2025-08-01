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
    const listaPRTs = registros.map(reg => reg.prt?.replace('#PRT', '')).filter(Boolean);
    console.table(listaPRTs);
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
  const linhasLimpas = texto
  .split(/\\par\b/)
  .map(l => l.replace(/\\[a-z]+\d*|{|}|\s+/gi, ' ').trim())
  .filter(Boolean);

const resultadosFormatados = [];

for (let i = 0; i < linhasLimpas.length - 1; i++) {
  const linhaAtual = linhasLimpas[i];
  const linhaSeguinte = linhasLimpas[i + 1];

  const regexVersao = /^\-\s*(\d+\.\d+\.\d+\.\d+)\s*\((\d{2}\/\d{2}\/\d{4})\)/;

  if (regexVersao.test(linhaSeguinte)) {
    const versao = linhaSeguinte.match(regexVersao)[0];
    resultadosFormatados.push(`${linhaAtual} - ${versao}`);
  }
}


  const protocolosLocalizados = [...texto.matchAll(/Protocolo:\s*(\d+)/g)].map(m => m[1]);
  const encontrados = [...new Set(protocolosLocalizados)];
  console.table(encontrados);

  // CORRETO: aguardando a Promise
  const historicoPRTs = await obterListaPRTs();
  console.table(historicoPRTs);

const resultados = encontrados.map(protocolo => {
  // Procura no array de linhas formatadas por uma que contenha o protocolo
  const linhaMatch = resultadosFormatados.find(linha => linha.includes(protocolo));

  // Se encontrar, extrai o trecho após o hífen
  const versao = linhaMatch?.split(' - ').slice(1).join(' - ').trim() || '';

  return {
    protocolo,
    estaRegistrado: historicoPRTs.includes(protocolo),
    versao
  };
});

    // === 4. Renderiza o resultado ===
    const container = document.getElementById('liberacoes-container');
    let html = '';

    const encontradosRegistrados = resultados.filter(r => r.estaRegistrado);

    if (encontradosRegistrados.length) {
      html += '<table><tr><th style="text-align: left; padding: 6px;">Protocolo</th><th style="text-align: left; padding: 6px;">Versão</th></tr>';
      encontradosRegistrados.forEach(r => {
        html += `
          <tr>
            <td style="padding: 6px;">#PRT${r.protocolo}</td>
            <td style="padding: 6px;">${r.versao || '-'}</td>
          </tr>
        `;
      });
      html += '</table>';
    } else {
      html = '<p style="color: red; font-weight: bold;">Nenhum dos protocolos registrados no ProtoCord foi liberado no release selecionado!</p>';
    }

    container.innerHTML = html;
  };

  reader.readAsText(arquivo); // RTF tratado como texto bruto
}
