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

/*function processarRTF(event) {
  const arquivo = event.target.files[0];
   if (!arquivo) {
    console.warn("Nenhum arquivo selecionado.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const texto = e.target.result;
    // Extrai os protocolos do RTF (simplesmente como texto)
    const protocolosLocalizados = [...texto.matchAll(/Protocolo:\s*(\S+)/g)].map(m => m[1]);
    const encontrados = protocolosLocalizados.map(item => item.replace(')', ''));
    console.table(encontrados);
// Pega todos os protocolos da tabela de histórico
const protocolosHTML = document.querySelectorAll('.tabela-historico td');
const historicoPRTs = [...protocolosHTML]
  .map(el => el.textContent.trim())
  .map(texto => texto.replace(')', ''))
  .filter(texto => !isNaN(texto)); // só números válidos
    
// Confronta os dois
const resultados = encontrados.map(prt => {
  const regexVersao = new RegExp(`Protocolo:\\s*${prt}\\)[\\s\\-–]*(.*)`);
  const match = texto.match(regexVersao);
let versao = match ? match[1].trim() : '';
versao = versao.replace(/\\[a-zA-Z]+/g, '').trim();
versao = versao.replace(/(?:\d+|\s+\d+)/g, '').trim();

  return {
    protocolo: prt,
    estaRegistrado: historicoPRTs.includes(prt),
    versao: versao
  };
});

console.table(resultados.filter(r => r.estaRegistrado));

// Verifica se algum foi encontrado
const algumRegistrado = resultados.some(r => r.estaRegistrado);

// Renderiza tabela ou mostra mensagem
let html = '';
if (algumRegistrado) {
  html += '<tr><th style="text-align: left; padding: 6px;">Protocolo</th><th style="text-align: left; padding: 6px;">Versão</th></tr>';
  resultados.forEach(r => {
    if (r.estaRegistrado) {
      html += `<tr>
        <td style="padding: 6px;">#PRT${r.protocolo}</td>
        <td style="padding: 6px;">${r.versao}</td>
      </tr>`;
    }
  });
  html += '</table>';
} else {
  html = '<p style="color: red; font-weight: bold;">Nenhum dos protocolos registrados no ProtoCord foi liberado no release selecionado!</p>';
}

document.getElementById('liberacoes-container').innerHTML = html;
  };*/

function processarRTF(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) {
    console.warn("Nenhum arquivo selecionado.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const texto = e.target.result;

    // === 1. Extrai os protocolos do texto ===
    // Captura algo como "Protocolo: 123456" ou "Protocolo: 123456)"
    const protocolosLocalizados = [...texto.matchAll(/Protocolo:\s*(\d+)/g)].map(m => m[1]);

    // Remove duplicatas e garante limpeza
    const encontrados = [...new Set(protocolosLocalizados)];

    console.table(encontrados);

    // === 2. Captura os protocolos da tabela HTML ===
    const historicoPRTs = [...document.querySelectorAll('.tabela-historico td')]
      .map(td => td.textContent.trim().replace(/\D/g, '')) // remove tudo que não for número
      .filter(texto => texto); // descarta strings vazias

    // === 3. Processa os resultados com suas versões ===
    const resultados = encontrados.map(protocolo => {
      // Regex para encontrar a linha com "Protocolo: 123456)" e capturar o texto após hífens, por exemplo:
      // "Protocolo: 123456) - versão X" => captura "versão X"
      const regexVersao = new RegExp(`Protocolo:\\s*${protocolo}\\)?[\\s\\-–—]*(.*?)\\s*(\\\\|$)`, 'i');
      const match = texto.match(regexVersao);

      let versao = match?.[1] || '';
      
      // Remove comandos RTF como \par, \b, etc.
      versao = versao.replace(/\\[a-z]+\b/g, '').trim();

      // Limpa números isolados e múltiplos espaços
      versao = versao.replace(/\b\d+\b/g, '').replace(/\s+/g, ' ').trim();

      return {
        protocolo,
        estaRegistrado: historicoPRTs.includes(protocolo),
        versao
      };
    });

    console.table(resultados.filter(r => r.estaRegistrado));

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

  reader.readAsText(arquivo);
}


  reader.readAsText(arquivo); // RTF tratado como texto bruto
}
