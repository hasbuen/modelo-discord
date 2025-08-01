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

function processarRTF(event) {
  const arquivo = event.target.files[0];
   if (!arquivo) {
    console.warn("Nenhum arquivo selecionado.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const texto = e.target.result;
    // Extrai os protocolos do RTF (simplesmente como texto)
    const protocolosLocalizados = [...texto.matchAll(/Protocolo:\s*(\S+)/g)].map(m => m[1])
    const encontrados = protocolosLocalizados.map(item => item.replace(')', ''));
    
// Pega todos os protocolos da tabela de histórico
const protocolosHTML = document.querySelectorAll('.tabela-historico td');
const historicoPRTs = [...protocolosHTML]
  .map(el => el.textContent.trim())
  .filter(texto => texto.startsWith('#PRT'))
  .map(texto => texto.replace('#', ''));

// Confronta os dois
const resultados = encontrados.map(prt => ({
  protocolo: prt,
  estaRegistrado: historicoPRTs.includes(prt)
}));

// Verifica se algum foi encontrado
const algumRegistrado = resultados.some(r => r.estaRegistrado);

// Renderiza tabela ou mostra mensagem
let html = '';
if (algumRegistrado) {
  html += '<table><tr><th>Protocolo</th><th>Status</th></tr>';
  resultados.forEach(r => {
    html += `<tr>
      <td>${r.protocolo}</td>
      <td style="color: ${r.estaRegistrado ? 'green' : 'red'};">
        ${r.estaRegistrado ? '✓ Encontrado no histórico' : '✗ Não registrado'}
      </td>
    </tr>`;
  });
  html += '</table>';
} else {
  html = '<p style="color: red; font-weight: bold;">Nenhum dos protocolos registrados no ProtoCord foi liberado no release selecionado!</p>';
}

document.getElementById('liberacoes-container').innerHTML = html;
  };

  reader.readAsText(arquivo); // RTF tratado como texto bruto
}
