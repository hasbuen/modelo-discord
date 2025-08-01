function abrirArquivoRTF() {
  document.getElementById('arquivoRTF').click();
}

function mostrarLiberacoes() {
  const container = document.getElementById('liberacoes-container');
  container.classList.toggle('hidden');

  // Se ficou visível, inicia processamento do RTF
  if (!container.classList.contains('hidden')) {
    abrirArquivoRTF();
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
    console.log(texto)
    // Extrai os protocolos do RTF (simplesmente como texto)
    const encontrados = [...texto.matchAll(/Protocolo:\s*/g)].map(m => m[1]);
    console.log(encontrados)
    // Pega todos os protocolos da tabela de histórico
    const protocolosHTML = document.querySelectorAll('.tabela-historico td'); // ou ajuste conforme seu layout
    const historicoPRTs = [...protocolosHTML]
      .map(el => el.textContent.trim())
      .filter(texto => texto.startsWith('#PRT'))
      .map(texto => texto.replace('#', ''));

    // Confronta os dois
    const resultados = encontrados.map(prt => ({
      protocolo: prt,
      estaRegistrado: historicoPRTs.includes(prt)
    }));

    // Renderiza tabela
    let html = '<table><tr><th>Protocolo</th><th>Status</th></tr>';
    resultados.forEach(r => {
      html += `<tr>
        <td>${r.protocolo}</td>
        <td style="color: ${r.estaRegistrado ? 'green' : 'red'};">
          ${r.estaRegistrado ? '✓ Encontrado no histórico' : '✗ Não registrado'}
        </td>
      </tr>`;
    });
    html += '</table>';
    document.getElementById('liberacoes-container').innerHTML = html;

  };

  reader.readAsText(arquivo); // RTF tratado como texto bruto
}
