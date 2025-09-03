// Mensagens
const MENSAGEM_1 = "Selecione o tipo do protocolo!";
const MENSAGEM_2 = "Preencha todos os campos!";
const MENSAGEM_3 = "Por favor, insira um link válido!";
const MENSAGEM_4 = "Nenhum texto para copiar!";
const MENSAGEM_5 = "Texto copiado com sucesso!";
const MENSAGEM_6 = "Erro ao copiar o texto!";
const MENSAGEM_7 = "O protocolo deve conter apenas números!";
const MENSAGEM_8 = "O ticket deve conter apenas números!";

let registrosCache = [];

// Seleção de tipo com badges
function selecionarTipo(tipo) {
  const hiddenInput = document.getElementById("tipo");
  hiddenInput.value = tipo;

  // Resetar estados
  document.getElementById("btn-erro").classList.remove("ring-2", "ring-offset-2", "ring-red-400");
  document.getElementById("btn-sugestao").classList.remove("ring-2", "ring-offset-2", "ring-green-400");

  if (tipo === "erro") {
    document.getElementById("btn-erro").classList.add("ring-2", "ring-offset-2", "ring-red-400");
  } else if (tipo === "sugestao") {
    document.getElementById("btn-sugestao").classList.add("ring-2", "ring-offset-2", "ring-green-400");
  }
}

// Utils
function validarURL(url) {
  return /^(http:\/\/|https:\/\/)[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(url);
}
function validarNumeros(valor) { return /^\d+$/.test(valor); }

// Modal
function exibirModal(mensagem, prt = "", tipo = "info") {
  const modal = document.getElementById("errorModal");
  const modalIcon = document.getElementById("modalIcon");
  const modalText = document.getElementById("modalText");

  const icons = {
    erro: '<i data-lucide="alert-triangle" class="text-red-500 w-5 h-5"></i>',
    sucesso: '<i data-lucide="check-circle" class="text-green-500 w-5 h-5"></i>',
    info: '<i data-lucide="info" class="text-blue-400 w-5 h-5"></i>'
  };

  modalIcon.innerHTML = icons[tipo] || icons.info;
  modalText.textContent = mensagem + (prt?.trim() ? `\n ${prt}` : "");
  modalText.style.whiteSpace = "pre-wrap";
  modal.classList.remove("hidden");
  lucide.createIcons();
}
function fecharModal() { document.getElementById("errorModal").classList.add("hidden"); }

// API
async function carregarRegistrosProtocolos() {
  if (registrosCache.length > 0) return registrosCache;
  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/protocolos");
    const data = await res.json();
    data.sort((a, b) => b.id - a.id);
    registrosCache = data;
    return registrosCache;
  } catch { return []; }
}

// Form
function gerarTexto() {
  const tipoElement = document.getElementById('tipo').value.trim();
  const tipo = tipoElement === "erro" ? '0' : '1';

  const prt = document.getElementById('prt');
  const ticket = document.getElementById('ticket');
  const descricao = document.getElementById('descricao');
  const paliativo = document.getElementById('paliativo');
  const prazo = document.getElementById('prazo');
  const link = document.getElementById('link');
  const campos = [prt, ticket, descricao, paliativo, prazo, link];

  if (!tipoElement) return exibirModal(MENSAGEM_1, "", "erro");
  if (campos.some(f => !f.value.trim())) return exibirModal(MENSAGEM_2, "", "erro");
  if (!validarURL(link.value)) return exibirModal(MENSAGEM_3, "", "erro");
  if (!validarNumeros(prt.value.trim())) return exibirModal(MENSAGEM_7, "", "erro");
  if (!validarNumeros(ticket.value.trim())) return exibirModal(MENSAGEM_8, "", "erro");

  const formatar = txt => txt.split("\n").map(l => l.trim()).filter(Boolean).map(l => "  - " + l).join("\n");

  const descricaoFormatada = formatar(descricao.value);
  const paliativoFormatado = formatar(paliativo.value);

  let texto = "";
  if (tipo === '1') {
    texto = `**\`\`\`diff
+ Protocolo [SUGESTÃO]:
+ PRT: ${prt.value}
+ Ticket: ${ticket.value}
\`\`\`**
- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}
`;
  } else {
    texto = `**\`\`\`diff
- Protocolo [ERRO]:
- PRT: ${prt.value}
- Ticket: ${ticket.value}
\`\`\`**
- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}
`;
  }
  document.getElementById('output').value = texto;
}

async function salvarRegistro() {
  const tipo = document.getElementById("tipo").value;
  const prt = "#PRT" + document.getElementById("prt").value.trim();
  const ticket = "#" + document.getElementById("ticket").value.trim();
  const descricao = document.getElementById("descricao").value.trim();
  const paliativo = document.getElementById("paliativo").value.trim();
  const link = document.getElementById("link").value.trim();

  const registros = await carregarRegistrosProtocolos();
  if (registros.some(r => r.prt === prt)) return exibirModal("Já gravado!", prt, "info");

  const registro = { tipo: tipo === "erro" ? 0 : 1, prt, ticket, descricao, paliativo, link };

  try {
    await fetch('https://modelo-discord-server.vercel.app/api/protocolos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registro)
    });
    exibirModal("Registro salvo com sucesso!", "", "sucesso");
    await renderizarTabela();
  } catch { exibirModal("Erro ao salvar registro.", "", "erro"); }
}

function copiarTexto() {
  const texto = document.getElementById('output').value;
  if (!texto.trim()) return exibirModal(MENSAGEM_4, "", "info");
  navigator.clipboard.writeText(texto)
    .then(() => { exibirModal(MENSAGEM_5, "", "sucesso"); salvarRegistro(); })
    .catch(() => exibirModal(MENSAGEM_6, "", "erro"));
}

// Tabela
function filtrarTabela() {
  const f = document.getElementById("busca").value.toLowerCase();
  document.querySelectorAll("#tabelaRegistros tbody tr").forEach(tr => {
    tr.style.display = [...tr.children].some(td => td.textContent.toLowerCase().includes(f)) ? "" : "none";
  });
}

let ultimaColuna=-1, ordemAsc=true;
function ordenarTabela(idx) {
  const tbody=document.querySelector("#tabelaRegistros tbody");
  let linhas=[...tbody.querySelectorAll("tr")];
  if(ultimaColuna===idx) ordemAsc=!ordemAsc; else {ordemAsc=true; ultimaColuna=idx;}
  linhas.sort((a,b)=>{
    let va=a.children[idx].textContent.trim().toLowerCase();
    let vb=b.children[idx].textContent.trim().toLowerCase();
    return ordemAsc?va.localeCompare(vb):vb.localeCompare(va);
  });
  linhas.forEach(l=>tbody.appendChild(l));
}

// Atualiza os contadores de erros e sugestões visíveis nos cards
async function atualizarContadoresDosCards(registros) {
    const totalErros = registros.filter(r => r.tipo === '0').length;
    const totalSugestoes = registros.filter(r => r.tipo === '1').length;

    const erroEl = document.getElementById("contador-erros");
    const sugestaoEl = document.getElementById("contador-sugestoes");

    // garante que a classe skeleton esteja ativa
    erroEl.classList.add("skeleton");
    sugestaoEl.classList.add("skeleton");

    // opcional: mantém o espaço em branco durante o carregamento
    erroEl.innerHTML = "&nbsp;";
    sugestaoEl.innerHTML = "&nbsp;";

    // simula delay de carregamento (ou aguarda dados reais)
    setTimeout(() => {
        // insere os valores reais
        erroEl.textContent = totalErros;
        sugestaoEl.textContent = totalSugestoes;

        // remove a classe skeleton para exibir o texto
        erroEl.classList.remove("skeleton");
        sugestaoEl.classList.remove("skeleton");
    }, 1000); // 1s é suficiente
}

/*async function renderizarTabela() {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  tbody.innerHTML = "";
  registrosCache = []; // força recarregamento

  const registros = await carregarRegistrosProtocolos();
  // Mensagem quando não há registros
  if (!registros || registros.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-gray-400 italic">
          No momento nenhum registro gravado.
        </td>
      </tr>
    `;
    return;
  }

  // helpers para escapar conteúdo em HTML / JS inline
  const escHTML = (s) => {
    if (!s && s !== 0) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  const escJS = (s) => {
    if (!s && s !== 0) return "";
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "");
  };

  // Preenche a tabela
  registros.forEach(reg => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-800";

    const badgeHTML = reg.tipo === '1'
      ? '<span class="px-3 py-1 text-xs font-bold rounded-full bg-green-700 text-green-100">Sugestão</span>'
      : '<span class="px-3 py-1 text-xs font-bold rounded-full bg-red-700 text-red-100">Erro</span>';

    const descricaoEsc = escHTML(reg.descricao || "");
    const descricaoTooltip = descricaoEsc.replace(/\n/g, "<br>");

    // botões: Ver (abre paliativo), Copiar (chama copiarLinha), Excluir (chama abrirModalExclusao)
    const paliativoForOnclick = escJS(reg.paliativo || "");
    const ticketForOnclick = escJS(reg.ticket || "");

    tr.innerHTML = `
      <td class="py-2 px-3 align-top">
        <a href="${escHTML(reg.link || '#')}" target="_blank" class="text-blue-400 underline">
          ${escHTML(reg.ticket || '')}
        </a>
      </td>

      <td class="py-2 px-3 align-top">${escHTML(reg.prt || '')}</td>

      <td class="py-2 px-3 align-top">${badgeHTML}</td>

      <td class="py-2 px-3 align-top">
        <div class="tooltip-container relative">
          <span class="desc-clamp">${escHTML((reg.descricao||'').slice(0, 300))}${(reg.descricao && reg.descricao.length>300 ? ' ...' : '')}</span>
          <div class="tooltip-text">${descricaoTooltip}</div>
        </div>
      </td>

      <td class="py-2 px-3 align-top flex gap-2">
        <button class="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs"
                onclick="mostrarModalPaliativo('${paliativoForOnclick}')">
          Ver
        </button>

        <button class="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs"
                onclick="copiarLinha(this, '${paliativoForOnclick}')">
          <i data-lucide="copy" class="w-4 h-4"></i>
        </button>

        <button class="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs"
                onclick="abrirModalExclusao(${Number(reg.id)}, '${ticketForOnclick}')">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // renderiza ícones Lucide dentro das linhas recém-criadas
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}*/

async function renderizarTabela() {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  tbody.innerHTML = "";
  registrosCache = []; // força recarregamento

  const registros = await carregarRegistrosProtocolos();
  atualizarContadoresDosCards(registros); 
  // Mensagem quando não há registros
  if (!registros || registros.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-gray-400 italic">
          No momento nenhum registro gravado.
        </td>
      </tr>
    `;
    return;
  }

  // helpers para escapar conteúdo em HTML / JS inline
  const escHTML = (s) => {
    if (!s && s !== 0) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  // Preenche a tabela
  registros.forEach(reg => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-800";

    const badgeHTML = reg.tipo === '1'
      ? '<span class="px-3 py-1 text-xs font-bold rounded-full bg-green-700 text-green-100">Sugestão</span>'
      : '<span class="px-3 py-1 text-xs font-bold rounded-full bg-red-700 text-red-100">Erro</span>';

    // Cria as células da tabela
    const tdTicket = document.createElement("td");
    tdTicket.className = "py-2 px-3 align-top";
    tdTicket.innerHTML = `<a href="${escHTML(reg.link || '#')}" target="_blank" class="text-blue-400 underline">${escHTML(reg.ticket || '')}</a>`;
    
    const tdPrt = document.createElement("td");
    tdPrt.className = "py-2 px-3 align-top";
    tdPrt.textContent = escHTML(reg.prt || '');
    
    const tdTipo = document.createElement("td");
    tdTipo.className = "py-2 px-3 align-top";
    tdTipo.innerHTML = badgeHTML;
    
    const tdDescricao = document.createElement("td");
    tdDescricao.className = "py-2 px-3 align-top";
    const descricaoTooltip = (reg.descricao || "").replace(/\n/g, "<br>");
    tdDescricao.innerHTML = `
      <div class="tooltip-container relative">
        <span class="desc-clamp">${escHTML((reg.descricao || '').slice(0, 300))}${(reg.descricao && reg.descricao.length > 300 ? ' ...' : '')}</span>
        <div class="tooltip-text">${descricaoTooltip}</div>
      </div>
    `;

    // Cria os botões e anexa os eventos
    const tdAcoes = document.createElement("td");
    tdAcoes.className = "py-2 px-3 align-top flex gap-2";

    const btnVer = document.createElement("button");
    btnVer.className = "bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs";
    btnVer.textContent = "Ver";
    btnVer.onclick = () => mostrarModalPaliativo(reg.paliativo || "");
    
    const btnCopiar = document.createElement("button");
    btnCopiar.className = "bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs";
    btnCopiar.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i>';
    btnCopiar.onclick = () => copiarLinha(btnCopiar, reg.paliativo || "");

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs";
    btnExcluir.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
    btnExcluir.onclick = () => abrirModalExclusao(Number(reg.id), reg.ticket || "");

    tdAcoes.appendChild(btnVer);
    tdAcoes.appendChild(btnCopiar);
    tdAcoes.appendChild(btnExcluir);

    // Anexa as células à linha
    tr.appendChild(tdTicket);
    tr.appendChild(tdPrt);
    tr.appendChild(tdTipo);
    tr.appendChild(tdDescricao);
    tr.appendChild(tdAcoes);
    
    tbody.appendChild(tr);
  });

  // renderiza ícones Lucide dentro das linhas recém-criadas
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

// Chamar a API assim que a página carregar
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const registros = await carregarRegistrosProtocolos();
        await atualizarContadoresDosCards(registros);
        await renderizarTabela();
    } catch (err) {
        console.error("Erro ao inicializar a página:", err);
    }
});
