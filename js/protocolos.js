/**
 * Gerenciador de protocolos com modal interativo.
 * Diferencia protocolos de erro e sugestão e expõe helpers para outros módulos.
 */

let protocolosCache = {};

async function carregarProtocolos() {
  try {
    const response = await fetch(window.getProtocordApiUrl("/protocolos"));
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const protocolos = await response.json();
    protocolosCache = {};
    protocolos.forEach((item) => {
      protocolosCache[item.prt] = item;
    });

    if (typeof criarIndiceProtocolos === "function") {
      await criarIndiceProtocolos(protocolos);
    }

    return protocolos;
  } catch (error) {
    console.error("Falha ao carregar protocolos:", error);
    return [];
  }
}

async function criarIndiceProtocolos(protocolos) {
  window.protocolosIndex = {};

  let modulos = [];
  try {
    const response = await fetch(window.getProtocordApiUrl("/modulos"));
    if (response.ok) {
      modulos = await response.json();
    }
  } catch (error) {
    console.warn("Não foi possível carregar nomes de módulos; usando valor bruto.", error);
  }

  const moduloMap = {};
  modulos.forEach((item) => {
    moduloMap[String(item.id)] = item.modulo;
  });

  protocolos.forEach((item) => {
    const moduloId = String(item.modulo ?? "");
    window.protocolosIndex[item.prt] = {
      modulo: moduloMap[moduloId] || item.modulo || "Desconhecido",
      tipo: item.tipo,
      descricao: item.descricao,
      ticket: item.ticket || "",
      link: item.link || "",
    };
  });
}

function renderizarFiltroModulos() {
  const container = document.getElementById("filtro-modulos");
  if (!container || !window.protocolosIndex) return;

  container.innerHTML = "";
  const modulos = new Set(Object.values(window.protocolosIndex).map((item) => item.modulo));

  const criarChip = (label, ativo) => {
    const safeLabel = String(label).replace(/'/g, "\\'");
    return `
      <button
        onclick="selecionarModulo('${safeLabel}')"
        class="px-3 py-1.5 rounded-full text-xs font-semibold transition ${
          ativo ? "bg-blue-600 text-white shadow" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
        }">
        ${label}
      </button>
    `;
  };

  container.innerHTML += criarChip("TODOS", window.moduloSelecionado === "TODOS");
  [...modulos].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach((modulo) => {
    container.innerHTML += criarChip(modulo, window.moduloSelecionado === modulo);
  });
}

function selecionarModulo(modulo) {
  window.moduloSelecionado = modulo;
  aplicarFiltroModulo();
  renderizarFiltroModulos();
}

function aplicarFiltroModulo() {
  if (window.moduloSelecionado === "TODOS") {
    if (typeof renderizarTabelaLiberacoes === "function") {
      renderizarTabelaLiberacoes(window.liberacoesOriginais);
    }
    return;
  }

  const filtradas = (window.liberacoesOriginais || [])
    .map((release) => {
      const protocolosFiltrados = release.protocolos.filter((prt) => {
        return window.protocolosIndex?.[prt]?.modulo === window.moduloSelecionado;
      });

      return {
        ...release,
        protocolos: protocolosFiltrados,
      };
    })
    .filter((item) => item.protocolos.length > 0);

  if (typeof renderizarTabelaLiberacoes === "function") {
    renderizarTabelaLiberacoes(filtradas);
  }
}

function obterProtocolo(prt) {
  return protocolosCache[prt] || null;
}

function getTipoLabel(tipo) {
  return String(tipo) === "0" ? "Erro" : "Sugestão";
}

function getCorTipo(tipo) {
  return String(tipo) === "0" ? "red" : "green";
}

function criarBadgeProtocolo(prt) {
  const protocolo = obterProtocolo(prt);
  const tipo = protocolo?.tipo || "1";
  const tipoLabel = getTipoLabel(tipo);
  const corTipo = getCorTipo(tipo);
  const classesCor =
    corTipo === "red"
      ? "bg-red-700 text-red-100 hover:bg-red-600"
      : "bg-green-700 text-green-100 hover:bg-green-600";

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

function abrirModalProtocolo(prt) {
  const protocolo = obterProtocolo(prt);
  if (!protocolo) return;

  const tipo = getTipoLabel(protocolo.tipo);
  const corTipo = getCorTipo(protocolo.tipo);
  const classesCor = corTipo === "red" ? "red" : "green";
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const isDarkMode =
    !bodyBg.includes("rgb(255") && !bodyBg.includes("rgb(254") && !bodyBg.includes("rgb(245");

  const bgModal = isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300";
  const bgHeader = isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300";
  const textPrimario = isDarkMode ? "text-white" : "text-gray-900";
  const textSecundario = isDarkMode ? "text-gray-400" : "text-gray-600";
  const textTerciario = isDarkMode ? "text-gray-300" : "text-gray-700";
  const btnSecundario = isDarkMode
    ? "bg-gray-700 hover:bg-gray-600 text-white"
    : "bg-gray-300 hover:bg-gray-400 text-gray-900";
  const hoverIcon = isDarkMode ? "hover:text-white" : "hover:text-gray-900";

  const modalHTML = `
    <div id="modal-protocolo-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
      <div class="${bgModal} rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border">
        <div class="sticky top-0 ${bgHeader} px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 class="${textPrimario} text-xl font-bold">${protocolo.prt}</h2>
            <p class="${textSecundario} text-sm">${protocolo.ticket || "--"}</p>
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

        <div class="px-6 py-4 space-y-4">
          <div class="flex items-center gap-2">
            <span class="${textTerciario} text-sm font-semibold">Tipo:</span>
            <span class="inline-block px-3 py-1 text-sm rounded font-semibold ${
              classesCor === "red" ? "bg-red-900 text-red-100" : "bg-green-900 text-green-100"
            }">
              ${tipo}
            </span>
          </div>

          <div>
            <h3 class="${textTerciario} text-sm font-semibold mb-2">Descrição:</h3>
            <p class="${textPrimario} text-sm leading-relaxed whitespace-pre-wrap font-medium">
              ${protocolo.descricao || "Sem descrição."}
            </p>
          </div>

          <div>
            <h3 class="${textTerciario} text-sm font-semibold mb-2">Paliativo:</h3>
            <p class="${textPrimario} text-sm leading-relaxed whitespace-pre-wrap font-medium">
              ${protocolo.paliativo || "Não disponível"}
            </p>
          </div>

          ${
            protocolo.link
              ? `
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
          `
              : ""
          }
        </div>

        <div class="${bgHeader} px-6 py-4 border-t flex justify-end gap-2">
          <button
            onclick="fecharModalProtocolo()"
            class="px-4 py-2 ${btnSecundario} rounded transition font-medium"
          >
            Fechar
          </button>
          ${
            protocolo.link
              ? `
            <a
              href="${protocolo.link}"
              target="_blank"
              rel="noopener noreferrer"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium"
            >
              Ver ticket
            </a>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;

  document.getElementById("modal-protocolo-overlay")?.remove();
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function fecharModalProtocolo() {
  document.getElementById("modal-protocolo-overlay")?.remove();
}

function inicializarClicksProtocolos() {
  document.addEventListener("click", (event) => {
    const badge = event.target.closest(".badge-protocolo");
    if (!badge) return;
    abrirModalProtocolo(badge.getAttribute("data-prt"));
  });

  document.addEventListener("click", (event) => {
    if (event.target.id === "modal-protocolo-overlay") {
      fecharModalProtocolo();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharModalProtocolo();
    }
  });
}

window.obterProtocolo = obterProtocolo;
window.abrirModalProtocolo = abrirModalProtocolo;
window.fecharModalProtocolo = fecharModalProtocolo;
window.criarBadgeProtocolo = criarBadgeProtocolo;
window.inicializarClicksProtocolos = inicializarClicksProtocolos;
window.carregarProtocolos = carregarProtocolos;
window.getTipoLabel = getTipoLabel;
window.selecionarModulo = selecionarModulo;
window.aplicarFiltroModulo = aplicarFiltroModulo;
window.renderizarFiltroModulos = renderizarFiltroModulos;
