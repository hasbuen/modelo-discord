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