/**
 * Gerenciador de Protocolos com Modal Interativo
 * Diferencia protoclos de erro vs sugestão
 */

let protocolosCache = {};

/**
 * Carrega dados dos protocolos a partir da API
 */
async function carregarProtocolos() {
  try {
    const response = await fetch('https://modelo-discord-server.vercel.app/api/protocolos');
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const protocolos = await response.json();
    protocolos.forEach(p => {
      protocolosCache[p.prt] = p;
    });

    return protocolos;
  } catch (error) {
    return [];
  }
}

/**
 * Obtém informações de um protocolo específico
 */
function obterProtocolo(prt) {
  return protocolosCache[prt] || null;
}

/**
 * Converte tipo de protocolo (0/1) para label legível
 */
function getTipoLabel(tipo) {
  return tipo === '0' ? 'Erro' : 'Sugestão';
}

/**
 * Obtém cor para o tipo de protocolo
 */
function getCorTipo(tipo) {
  // 0 = Erro (vermelho), 1 = Sugestão (verde)
  return tipo === '0' ? 'red' : 'green';
}

/**
 * Cria HTML para um badge de protocolo clicável
 */
function criarBadgeProtocolo(prt) {
  const protocolo = obterProtocolo(prt);
  const tipo = protocolo?.tipo || '1';
  const tipoLabel = getTipoLabel(tipo);
  const corTipo = getCorTipo(tipo);
  
  // Classes de cor baseadas no tipo
  const classesCor = corTipo === 'red' 
    ? 'bg-red-700 text-red-100 hover:bg-red-600' 
    : 'bg-green-700 text-green-100 hover:bg-green-600';

  return `
    <span 
      class="inline-block px-2 py-1 mx-1 text-xs rounded cursor-pointer transition ${classesCor} badge-protocolo" 
      data-prt="${prt}"
      title="Clique para ver detalhes - ${tipoLabel}"
    >
      ${prt}
    </span>
  `;
}

/**
 * Abre modal com detalhes do protocolo
 */
function abrirModalProtocolo(prt) {
  const protocolo = obterProtocolo(prt);
  
  if (!protocolo) {
    return;
  }

  const tipo = getTipoLabel(protocolo.tipo);
  const corTipo = getCorTipo(protocolo.tipo);
  const classesCor = corTipo === 'red' ? 'red' : 'green';

  // Detecta tema claro ou escuro verificando o CSS computado do body
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const isDarkMode = !bodyBg.includes('rgb(255') && !bodyBg.includes('rgb(254') && !bodyBg.includes('rgb(245');
  
  const bgModal = isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300';
  const bgHeader = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300';
  const textPrimario = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecundario = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const textTerciario = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const btnSecundario = isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900';
  const hoverIcon = isDarkMode ? 'hover:text-white' : 'hover:text-gray-900';

  const modalHTML = `
    <div id="modal-protocolo-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
      <div class="${bgModal} rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border">
        <!-- Header -->
        <div class="sticky top-0 ${bgHeader} px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 class="${textPrimario} text-xl font-bold">${protocolo.prt}</h2>
            <p class="${textSecundario} text-sm">${protocolo.ticket}</p>
          </div>
          <button 
            onclick="fecharModalProtocolo()" 
            class="${textSecundario} ${hoverIcon} transition"
            title="Fechar"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-4 space-y-4">
          <!-- Tipo Badge -->
          <div class="flex items-center gap-2">
            <span class="${textTerciario} text-sm font-semibold">Tipo:</span>
            <span class="inline-block px-3 py-1 text-sm rounded font-semibold ${
              classesCor === 'red' 
                ? 'bg-red-900 text-red-100' 
                : 'bg-green-900 text-green-100'
            }">
              ${tipo}
            </span>
          </div>

          <!-- Descrição -->
          <div>
            <h3 class="${textTerciario} text-sm font-semibold mb-2">Descrição:</h3>
            <p class="${textPrimario} text-sm leading-relaxed whitespace-pre-wrap font-medium">
              ${protocolo.descricao}
            </p>
          </div>

          <!-- Paliativo -->
          <div>
            <h3 class="${textTerciario} text-sm font-semibold mb-2">Paliativo:</h3>
            <p class="${textPrimario} text-sm leading-relaxed whitespace-pre-wrap font-medium">
              ${protocolo.paliativo || 'Não disponível'}
            </p>
          </div>

          <!-- Link -->
          ${protocolo.link ? `
            <div>
              <h3 class="${textTerciario} text-sm font-semibold mb-2">Referência:</h3>
              <a 
                href="${protocolo.link}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline break-all font-medium"
              >
                Abrir ticket
              </a>
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="${bgHeader} px-6 py-4 border-t flex justify-end gap-2">
          <button 
            onclick="fecharModalProtocolo()" 
            class="px-4 py-2 ${btnSecundario} rounded transition font-medium"
          >
            Fechar
          </button>
          ${protocolo.link ? `
            <a 
              href="${protocolo.link}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium"
            >
              Ver Ticket
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Remove modal anterior se existir
  const modalAnterior = document.getElementById('modal-protocolo-overlay');
  if (modalAnterior) {
    modalAnterior.remove();
  }

  // Adiciona novo modal ao body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Fecha modal de protocolo
 */
function fecharModalProtocolo() {
  const modal = document.getElementById('modal-protocolo-overlay');
  if (modal) {
    modal.remove();
  }
}

/**
 * Adiciona listeners para todos os badges de protocolo
 */
function inicializarClicksProtocolos() {
  document.addEventListener('click', function(event) {
    const badge = event.target.closest('.badge-protocolo');
    if (badge) {
      const prt = badge.getAttribute('data-prt');
      abrirModalProtocolo(prt);
    }
  });

  // Fecha modal ao clicar no overlay
  document.addEventListener('click', function(event) {
    if (event.target.id === 'modal-protocolo-overlay') {
      fecharModalProtocolo();
    }
  });

  // Fecha modal ao pressionar Escape
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      fecharModalProtocolo();
    }
  });

}

// Expõe funções globalmente
window.obterProtocolo = obterProtocolo;
window.abrirModalProtocolo = abrirModalProtocolo;
window.fecharModalProtocolo = fecharModalProtocolo;
window.criarBadgeProtocolo = criarBadgeProtocolo;
window.inicializarClicksProtocolos = inicializarClicksProtocolos;
window.carregarProtocolos = carregarProtocolos;
