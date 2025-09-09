export function exibirModal(mensagem, prt = "", tipo = "info") {
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

export const fecharModal = () =>
  document.getElementById("errorModal").classList.add("hidden");

export const fecharConfirmModal = () =>
  document.getElementById("confirmModal").classList.add("hidden");
