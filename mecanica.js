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

// Lógica de temas
function alternarTema(tema) {
  const html = document.documentElement;
  const botoesTema = document.querySelectorAll('.toggle-theme-btn');

  // Remove a classe 'active' de todos os botões de tema
  botoesTema.forEach(btn => btn.classList.remove('active'));

  if (tema === 'system') {
    localStorage.removeItem('theme');
    html.removeAttribute('data-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const botaoPreferido = document.getElementById(prefersDark ? 'tema-escuro' : 'tema-claro');
    if (botaoPreferido) {
      botaoPreferido.classList.add('active');
    }
  } else {
    localStorage.setItem('theme', tema);
    html.setAttribute('data-theme', tema);
    const botaoTema = document.getElementById(`tema-${tema}`);
    if (botaoTema) {
      botaoTema.classList.add('active');
    }
  }
}

function carregarTemaPreferido() {
  const temaSalvo = localStorage.getItem('theme');
  const html = document.documentElement;
  
  if (temaSalvo) {
    html.setAttribute('data-theme', temaSalvo);
    const botaoTema = document.getElementById(`tema-${temaSalvo}`);
    if (botaoTema) {
      botaoTema.classList.add('active');
    }
  } else {
    html.removeAttribute('data-theme');
    const botaoSistema = document.getElementById('tema-sistema');
    if (botaoSistema) {
      botaoSistema.classList.add('active');
    }
  }
}

// Utils
function validarURL(url) {
  return /^(http:\/\/|https:\/\/)[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(url);
}

function validarNumeros(valor) { 
  return /^\d+$/.test(valor); 
}

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

function fecharConfirmModal() {
  document.getElementById("confirmModal").classList.add("hidden");
}

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
    texto = `**\\\diff
+ Protocolo [SUGESTÃO]:
+ PRT: ${prt.value}
+ Ticket: ${ticket.value}
\\\**- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}`;
  } else {
    texto = `**\\\diff
- Protocolo [ERRO]:
- PRT: ${prt.value}
- Ticket: ${ticket.value}
\\\**- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}`;
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
    return ordemAsc?va.localeCompare(vb):vb.localeCompare(a);
  });
  linhas.forEach(l=>tbody.appendChild(l));
}

function mostrarModalPaliativo(paliativo) {
  const modal = document.getElementById("errorModal");
  const modalIcon = document.getElementById("modalIcon");
  const modalText = document.getElementById("modalText");
  modalIcon.innerHTML = `<i data-lucide="info" class="text-blue-400 w-5 h-5"></i>`;
  modalText.textContent = paliativo.trim() || "Nenhum paliativo registrado.";
  modal.classList.remove("hidden");
  lucide.createIcons();
}

function copiarLinha(botao, paliativo) {
  navigator.clipboard.writeText(paliativo.trim() || "")
    .then(() => {
      const originalText = botao.innerHTML;
      botao.innerHTML = "OK";
      setTimeout(() => {
        botao.innerHTML = originalText;
        lucide.createIcons();
      }, 1000);
    })
    .catch(() => exibirModal("Erro ao copiar o paliativo.", "", "erro"));
}

async function abrirModalExclusao(id, ticket) {  
  const modal = document.getElementById("confirmModal");
  const confirmBtn = document.getElementById("confirmBtn");
  
  console.log(id+"  ticket "+ticket);
  
  document.getElementById("confirmIcon").innerHTML = `<i data-lucide="trash-2" class="text-red-500 w-5 h-5"></i>`;
  document.getElementById("confirmText").textContent = `Tem certeza que deseja excluir o registro do ticket ${ticket}?`;

  console.log("de novo:  "+id+"  ticket "+ticket);
  
  confirmBtn.onclick = async () => {
     fecharConfirmModal();
    
     console.log("entrou e o id é: "+id+"  ticket "+ticket);
    
    try {
      await fetch("https://modelo-discord-server.vercel.app/api/protocolos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      })
      exibirModal("Registro excluído com sucesso!", "", "sucesso");
      await renderizarTabela();
    } catch {
      exibirModal("Erro ao excluir registro.", "", "erro");
    } 
  };

  modal.classList.remove("hidden");
  lucide.createIcons();
}

// Atualiza os contadores de erros e sugestões visíveis nos cards
async function atualizarContadoresDosCards(registros) {
    const totalErros = registros.filter(r => r.tipo === '0').length;
    const totalSugestoes = registros.filter(r => r.tipo === '1').length;

    const erroEl = document.getElementById("contador-erros");
    const sugestaoEl = document.getElementById("contador-sugestoes");

    erroEl.classList.remove("skeleton");
    sugestaoEl.classList.remove("skeleton");
    
    erroEl.textContent = totalErros;
    sugestaoEl.textContent = totalSugestoes;
}

async function renderizarTabela() {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  tbody.innerHTML = "";
  registrosCache = []; // força recarregamento

  const registros = await carregarRegistrosProtocolos();
  await atualizarContadoresDosCards(registros); 
  // Mensagem quando não há registros
  if (!registros || registros.length === 0) {
    tbody.innerHTML = `      <tr>
        <td colspan="5" class="text-center py-6 text-gray-400 italic">
          No momento nenhum registro gravado.
        </td>
      </tr>
    `;
    return;
  }

  // helpers para escapar conteúdo em HTML
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

    const descricaoEsc = escHTML(reg.descricao || "");
    const descricaoTooltip = descricaoEsc.replace(/\n/g, "<br>");

    // Constroi o HTML sem o evento onclick, que será adicionado programaticamente
    tr.innerHTML = `      <td class="py-2 px-3 align-top">
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
                onclick="mostrarModalPaliativo('${escHTML(reg.paliativo || '').replace(/'/g, "\\'")}')">
          Ver
        </button>

        <button class="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs"
                onclick="copiarLinha(this, '${escHTML(reg.paliativo || '').replace(/'/g, "\\'")}')">
          <i data-lucide="copy" class="w-4 h-4"></i>
        </button>

        <button class="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    
    // Anexa o evento de exclusão programaticamente
    const btnExcluir = tr.querySelector('.bg-red-600');
    if (btnExcluir) {
        btnExcluir.onclick = () => abrirModalExclusao(Number(reg.id), reg.ticket);
    }
    
    tbody.appendChild(tr);
  });

  // renderiza ícones Lucide dentro das linhas recém-criadas
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
/*
async function renderizarTabela() {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  tbody.innerHTML = "";
  registrosCache = []; // força recarregamento

  const registros = await carregarRegistrosProtocolos();
  await atualizarContadoresDosCards(registros); 
  // Mensagem quando não há registros
  if (!registros || registros.length === 0) {
    tbody.innerHTML = `      <tr>
        <td colspan="5" class="text-center py-6 text-gray-400 italic">
          No momento nenhum registro gravado.
        </td>
      </tr>
    `;    return;
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

    tr.innerHTML = `      <td class="py-2 px-3 align-top">
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
}
*/
// Chamar a API assim que a página carregar
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const registros = await carregarRegistrosProtocolos();
        await atualizarContadoresDosCards(registros);
        await renderizarTabela();
        carregarTemaPreferido();
    } catch (err) {
        console.error("Erro ao inicializar a página:", err);
    }
});
