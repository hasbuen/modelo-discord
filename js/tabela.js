import { exibirModal } from "./modal.js";
import { carregarRegistrosProtocolos, resetCache } from "./api.js";

// Variáveis globais para ordenação
let ultimaColuna = -1, ordemAsc = true;

// Funções Auxiliares

export function fecharConfirmModal() {
    document.getElementById("confirmModal").classList.add("hidden");
}

// Funções de Tabela

export function filtrarTabela() {
  const f = document.getElementById("busca").value.toLowerCase();
  document.querySelectorAll("#tabelaRegistros tbody tr").forEach(tr => {
    // Verifica se alguma célula (td) da linha contém o texto de busca
    tr.style.display = [...tr.children].some(td =>
      td.textContent.toLowerCase().includes(f)
    ) ? "" : "none";
  });
}

export function ordenarTabela(idx) {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  let linhas = [...tbody.querySelectorAll("tr")];
  
  // Define a direção da ordenação
  if (ultimaColuna === idx) {
    ordemAsc = !ordemAsc;
  } else { 
    ordemAsc = true; 
    ultimaColuna = idx; 
  }
  
  // Realiza a ordenação
  linhas.sort((a, b) => {
    let va = a.children[idx].textContent.trim().toLowerCase();
    let vb = b.children[idx].textContent.trim().toLowerCase();
    
    // Comparação de string usando localeCompare
    return ordemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  
  // Reinsere as linhas ordenadas no tbody
  linhas.forEach(l => tbody.appendChild(l));
}

// Funções de Modal e Ação

export function mostrarModalPaliativo(paliativo) {
  const modal = document.getElementById("errorModal");
  const modalIcon = document.getElementById("modalIcon");
  const modalText = document.getElementById("modalText");
  
  modalIcon.innerHTML = `<i data-lucide="info" class="text-blue-400 w-5 h-5"></i>`;
  modalText.textContent = paliativo.trim() || "Nenhum paliativo registrado.";
  
  modal.classList.remove("hidden");
  
  if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
  }
}

// FUNÇÃO ATUALIZADA: Copia todas as informações da linha
export function copiarLinha(botao, dadosJSON) {
  let textoFormatado = "";
  
  try {
    const dados = JSON.parse(dadosJSON);
    
    // Formatação organizada dos dados para cópia
    textoFormatado = `[Protocolo - Registro]\n` +
                     `-----------------------------------\n` +
                     `🎫 TICKET: ${dados.Ticket}\n` +
                     `📄 PRT: ${dados.PRT}\n` +
                     `🏷️ TIPO: ${dados.Tipo}\n\n` +
                     `📝 DESCRIÇÃO:\n${dados.Descricao}\n\n` +
                     `🩹 PALIATIVO:\n${dados.Paliativo}`;

  } catch (e) {
    exibirModal("Erro interno ao preparar os dados para cópia.", "", "erro");
    return; 
  }

  // Copia o texto formatado para a área de transferência
  navigator.clipboard.writeText(textoFormatado)
    .then(() => {
      const originalText = botao.innerHTML;
      botao.innerHTML = "COPIADO";
      setTimeout(() => {
        botao.innerHTML = originalText;
        if (window.lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
      }, 1500); 
    })
    .catch((error) => {
        exibirModal("Erro ao copiar. Verifique as permissões do navegador.", "", "erro");
    });
}

export async function abrirModalExclusao(id, ticket) {
  const modal = document.getElementById("confirmModal");
  const confirmBtn = document.getElementById("confirmBtn");

  document.getElementById("confirmIcon").innerHTML =
    `<i data-lucide="trash-2" class="text-red-500 w-5 h-5"></i>`;
  document.getElementById("confirmText").textContent =
    `Tem certeza que deseja excluir o registro do ticket ${ticket}?`;

  confirmBtn.onclick = async () => {
    fecharConfirmModal();
    try {
      await fetch("https://modelo-discord-server.vercel.app/api/protocolos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      });
      exibirModal("Registro excluído com sucesso!", "", "sucesso");
      await renderizarTabela();
    } catch {
      exibirModal("Erro ao excluir registro.", "", "erro");
    }
  };

  modal.classList.remove("hidden");
  if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
  }
}

export async function atualizarContadoresDosCards(registros) {
  const totalErros = registros.filter(r => r.tipo === '0').length;
  const totalSugestoes = registros.filter(r => r.tipo === '1').length;

  const erroEl = document.getElementById("contador-erros");
  const sugestaoEl = document.getElementById("contador-sugestoes");
  
  if (erroEl) {
      erroEl.classList.remove("skeleton");
      erroEl.textContent = totalErros;
  }
  if (sugestaoEl) {
      sugestaoEl.classList.remove("skeleton");
      sugestaoEl.textContent = totalSugestoes;
  }
}

// Renderização da Tabela

export async function renderizarTabela() {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  resetCache();

  // Estado de carregamento
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-6 text-gray-400">
        <div class="flex items-center justify-center space-x-2">
          <div class="relative w-8 h-8 rounded-full">
            <div class="absolute inset-0 rounded-full border-2 border-transparent"
              style="background: linear-gradient(90deg, #1a1a1a 0%, #2e2e2e 20%, #444444 40%, #5a5a5a 60%, #444444 80%, #2e2e2e 90%, #1a1a1a 100%); animation: spin-soft 1.5s ease-in-out infinite;">
            </div>
            <div class="absolute inset-1 bg-gray-900 rounded-full"></div>
          </div>
          <span class="text-white text-lg">Aguarde, em instantes...</span>
        </div>
      </td>
    </tr>`;

  try {
    const timerPromise = new Promise(resolve => setTimeout(resolve, 1000)); // Pelo menos 1 segundo de loading
    const [registros] = await Promise.all([
      carregarRegistrosProtocolos(),
      timerPromise
    ]);

    await atualizarContadoresDosCards(registros);
    tbody.innerHTML = "";

    if (!registros || registros.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-6 text-gray-400 italic">
            No momento nenhum registro gravado.
          </td>
        </tr>`;
      return;
    }

    // Função de escape HTML
    const escHTML = (s) =>
      !s && s !== 0 ? "" : String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    registros.forEach(reg => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-800";

      const badgeHTML = reg.tipo === '1'
        ? '<span class="px-3 py-1 text-xs font-bold rounded-full bg-green-700 text-green-100">Sugestão</span>'
        : '<span class="px-3 py-1 text-xs font-bold rounded-full bg-red-700 text-red-100">Erro</span>';

      const descricaoEsc = escHTML(reg.descricao || "");
      const descricaoTooltip = descricaoEsc.replace(/\n/g, "<br>");

      // Cria um objeto com os dados que serão copiados e o transforma em JSON
      const dadosParaCopia = JSON.stringify({
          Ticket: reg.ticket || '',
          PRT: reg.prt || '',
          Tipo: reg.tipo === '1' ? 'Sugestão' : 'Erro',
          Descricao: reg.descricao || '',
          Paliativo: reg.paliativo || ''
      });

      // Passa a string JSON escapada para a função copiarLinha
      const dadosCopiaEscapados = escHTML(dadosParaCopia).replace(/'/g, "\\'");

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
            <span class="desc-clamp">${escHTML((reg.descricao || '').slice(0, 300))}${(reg.descricao && reg.descricao.length > 300 ? ' ...' : '')}</span>
            <div class="tooltip-text">${descricaoTooltip}</div>
          </div>
        </td>
        <td class="py-2 px-3 align-top flex gap-2">
          <button class="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs"
                  onclick="mostrarModalPaliativo('${escHTML(reg.paliativo || '').replace(/'/g, "\\'")}')">
            Paliativo
          </button>
          <button class="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs"
                  onclick="copiarLinha(this, '${dadosCopiaEscapados}')">
            <i data-lucide="copy" class="w-4 h-4"></i>
          </button>
          <button class="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>`;

      const btnExcluir = tr.querySelector('.bg-red-600');
      if (btnExcluir) {
        // A função abrirModalExclusao já é exportada, então está disponível
        btnExcluir.onclick = () => abrirModalExclusao(Number(reg.id), reg.ticket);
      }

      tbody.appendChild(tr);
    });

    // Cria os ícones Lucide após a inserção de todas as linhas
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-red-400">
          Erro ao carregar os dados. Por favor, tente novamente.
        </td>
      </tr>`;
  }
}