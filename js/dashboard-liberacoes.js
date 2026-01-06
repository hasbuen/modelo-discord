let protocolosIndex = {};
let moduloSelecionado = 'TODOS';
let liberacoesOriginais = [];

let chartsInstance = {
  chartLiberacoes: null,
  chartTop5: null,
  chartEvolucao: null,
  chartTrendModulo: null
};

// Quantos módulos aparecem como "escalados" (destacados). Usuário pode alterar via UI (1,3,5).
let topEscalados = 3;

async function carregarDadosLiberacoes() {
  try {
    const response = await fetch('https://modelo-discord-server.vercel.app/api/liberados');

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const dadosAPI = await response.json();

    // Converte formato da API para nosso formato
    const liberacoes = dadosAPI.map(item => ({
      release: item.release,
      protocolos: item.prts.split(' ').filter(p => p.trim().length > 0)
    }));

    // Ordena por data decrescente (mais recente primeiro)
    liberacoes.sort((a, b) => {
      const dateA = new Date(a.release.split('/').reverse().join('-'));
      const dateB = new Date(b.release.split('/').reverse().join('-'));
      return dateB - dateA;
    });

    return liberacoes;
  } catch (error) {
    return [];
  }
}

/**
 * Salva dados de liberações no localStorage (opcional, para backup)
 */
function salvarDadosLiberacoes(dados) {
  try {
    localStorage.setItem('liberacoes_data', JSON.stringify(dados));
  } catch (e) {
  }
}

/**
 * Processa arquivo RTF e extrai releases/protocolos (obsoleto - dados vêm da API agora)
 */
function processarArquivoRTF(event) {
  console.warn('processarArquivoRTF não é mais necessário - dados vêm da API');
}

/**
 * Atualiza cards informativos
 */
function atualizarCards(liberacoes) {
  const totalReleases = liberacoes.length + " RLS";
  const totalProtocolos = liberacoes.reduce((sum, item) => sum + item.protocolos.length, 0) + " PRT";
  const ultimaLiberacao = liberacoes.length > 0 ? liberacoes[0].release : '—';

  const cardReleases = document.getElementById('card-releases');
  const cardProtocolos = document.getElementById('card-protocolos');
  const cardUltima = document.getElementById('card-ultima');

  if (cardReleases) {
    cardReleases.textContent = totalReleases;
  } else {
    console.warn('Elemento card-releases não encontrado');
  }

  if (cardProtocolos) {
    cardProtocolos.textContent = totalProtocolos;
  } else {
    console.warn('Elemento card-protocolos não encontrado');
  }

  if (cardUltima) {
    cardUltima.textContent = ultimaLiberacao;
  } else {
    console.warn('Elemento card-ultima não encontrado');
  }
}

/**
 * Renderiza tabela de liberações com protocolos clicáveis
 */
function renderizarTabelaLiberacoes(liberacoes) {
  const tbody = document.getElementById('tabelaLiberados');
  if (!tbody) {
    console.warn('Elemento tabelaLiberados não encontrado');
    return;
  }

  tbody.innerHTML = '';

  liberacoes.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-800 transition';

    // Cria badges clicáveis para cada protocolo
    const protocolosHTML = item.protocolos
      .map(p => criarBadgeProtocolo(p))
      .join('');

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-white">${item.release}</td>
      <td class="py-3 px-4 text-center text-gray-300">${item.protocolos.length}</td>
      <td class="py-3 px-4">
        <div class="flex flex-wrap gap-1">${protocolosHTML}</div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (liberacoes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">Nenhum dado de liberação encontrado</td></tr>';
  }
}

/**
 * Renderiza gráfico de barras (protocolos por release)
 */
function renderizarGraficoLiberacoes(liberacoes) {
  const ctx = document.getElementById('chartLiberacoes');
  if (!ctx || typeof Chart === 'undefined') {
    console.warn('Canvas ou Chart não encontrado');
    return;
  }

  if (chartsInstance.chartLiberacoes) {
    chartsInstance.chartLiberacoes.destroy();
  }

  const releases = liberacoes.map(item => item.release).reverse();
  const counts = liberacoes.map(item => item.protocolos.length).reverse();

  chartsInstance.chartLiberacoes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: releases,
      datasets: [{
        label: 'Protocolos por Release',
        data: counts,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#9CA3AF',
            font: { size: 12 }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#9CA3AF' },
          grid: { color: '#374151' }
        },
        x: {
          ticks: { color: '#9CA3AF' },
          grid: { color: '#374151' }
        }
      }
    }
  });
}



/**
 * Renderiza gráfico Pie (Top 5 releases)
 */
function renderizarGraficoTop5(liberacoes) {
  const ctx = document.getElementById('chartTop5');
  if (!ctx || typeof Chart === 'undefined') {
    console.warn('Canvas ou Chart não encontrado');
    return;
  }

  if (chartsInstance.chartTop5) {
    chartsInstance.chartTop5.destroy();
  }

  const sorted = [...liberacoes].sort((a, b) => b.protocolos.length - a.protocolos.length).slice(0, 5);
  const releases = sorted.map(item => item.release);
  const counts = sorted.map(item => item.protocolos.length);

  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(168, 85, 247, 0.8)'
  ];

  chartsInstance.chartTop5 = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: releases,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderColor: '#1F2937',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#9CA3AF',
            font: { size: 11 },
            padding: 15
          }
        }
      }
    }
  });
}

/**
 * Renderiza gráfico de linha (evolução acumulada)
 */
function renderizarGraficoEvolucao(liberacoes) {
  const ctx = document.getElementById('chartEvolucao');
  if (!ctx || typeof Chart === 'undefined') {
    console.warn('Canvas ou Chart não encontrado');
    return;
  }

  if (chartsInstance.chartEvolucao) {
    chartsInstance.chartEvolucao.destroy();
  }

  const releases = liberacoes.map(item => item.release);
  let acumulado = 0;
  const cumulativo = liberacoes.map(item => {
    acumulado += item.protocolos.length;
    return acumulado;
  });

  chartsInstance.chartEvolucao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: releases,
      datasets: [{
        label: 'Protocolos Acumulados',
        data: cumulativo,
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
        pointBorderColor: '#1F2937',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#9CA3AF',
            font: { size: 12 }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#9CA3AF' },
          grid: { color: '#374151' }
        },
        x: {
          ticks: { color: '#9CA3AF' },
          grid: { color: '#374151' }
        }
      }
    }
  });
}

/**
 * Renderiza todo o dashboard
 */
function renderizarDashboard(liberacoes) {

  if (!liberacoes || liberacoes.length === 0) {
    return;
  }

  atualizarCards(liberacoes);
  renderizarTabelaLiberacoes(liberacoes);

  // Aguarda um tempo para garantir que Chart.js está disponível
  setTimeout(() => {
    try {
      if (typeof Chart !== 'undefined') {
        renderizarGraficoLiberacoes(liberacoes);
        // Tendência: mostra a tendência do módulo selecionado ou do módulo mais crítico por padrão
        const defaultModulo = (moduloSelecionado && moduloSelecionado !== 'TODOS') ? moduloSelecionado : getTopModule(liberacoes);
        renderizarGraficoTrendModulo(liberacoes, defaultModulo);
        renderizarGraficoTop5(liberacoes);
        renderizarGraficoEvolucao(liberacoes);
      } else {
        console.error('Chart.js não foi carregado');
      }

      // Re-renderiza ícones Lucide
      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }

      // Inicializa sistema de protocolos (cliques e modal)
      if (typeof inicializarClicksProtocolos === 'function') {
        inicializarClicksProtocolos();
      }
    } catch (error) {
      console.error('Erro ao renderizar gráficos:', error);
    }
  }, 200);
}

/**
 * Função pública para carregar histórico (chamada pelo main)
 */
async function carregarHistoricoLiberacoes() {

  // Carrega os protocolos antes de renderizar a tabela
  if (typeof carregarProtocolos === 'function') {
    await carregarProtocolos();
  }

  liberacoesOriginais = await carregarDadosLiberacoes();
  renderizarFiltroModulos();
  renderizarDashboard(liberacoesOriginais);

  // Inicializa busca de módulos (campo "busca-modulo")
  if (typeof inicializarBuscaModulo === 'function') {
    inicializarBuscaModulo();
  }
}


// Expõe funções globalmente
window.carregarHistoricoLiberacoes = carregarHistoricoLiberacoes;
window.processarArquivoRTF = processarArquivoRTF;

/* =========================
   EXTENSÕES (NÃO ALTERA EXISTENTE)
========================= */

function habilitarCliqueGraficoLiberacoes() {
  if (!chartsInstance?.chartLiberacoes) return;

  chartsInstance.chartLiberacoes.options.onClick = (evt, elements) => {
    if (!elements.length) {
      renderizarDashboard(liberacoesOriginais);
      return;
    }
    const idx = elements[0].index;
    const release = chartsInstance.chartLiberacoes.data.labels[idx];
    const filtrado = liberacoesOriginais.filter(r => r.release === release);
    renderizarTabelaLiberacoes(filtrado);
  };
  chartsInstance.chartLiberacoes.update();
}

function obterDadosVisiveisTabela() {
  const linhas = document.querySelectorAll('#tabelaLiberados tr');
  const dados = [];
  linhas.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 3) return;
    const release = tds[0].innerText;
    const prts = [...tds[2].querySelectorAll('.prt-badge')].map(b => b.innerText.trim());
    prts.forEach(prt => dados.push({
      release,
      prt,
      modulo: protocolosIndex[prt]?.modulo || ''
    }));
  });
  return dados;
}

// Funções de Exportação
window.exportarCSV = function() {
  const dados = obterLiberacoesFiltradasAtuais();
  if (dados.length === 0) return alert("Não há dados para exportar.");

  let csv = 'Data;Protocolos\n';
  dados.forEach(row => {
    csv += `${row.release};${row.protocolos.join(' ')}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "liberacoes.csv");
  link.click();
};

window.exportarExcel = function() {
  const dados = obterLiberacoesFiltradasAtuais();
  if (dados.length === 0) return alert("Não há dados para exportar.");

  // Formato XML simplificado para Excel ler como planilha
  let excelContext = `
    <xml xmlns:x="urn:schemas-microsoft-com:office:excel">
      <table>
        <tr><th>Data</th><th>Protocolos</th></tr>
        ${dados.map(row => `<tr><td>${row.release}</td><td>${row.protocolos.join(', ')}</td></tr>`).join('')}
      </table>
    </xml>`;
  
  const blob = new Blob([excelContext], { type: 'application/vnd.ms-excel' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "liberacoes.xls");
  link.click();
};

// Correção do Ranking de Módulos
window.atualizarRankingModulos = function(liberacoes) {
  const rankingConteudo = document.getElementById('ranking-conteudo');
  if (!rankingConteudo) return;

  const contagem = {};
  liberacoes.forEach(lib => {
    lib.protocolos.forEach(prt => {
      const info = protocolosIndex[prt];
      const modulo = info ? info.modulo : 'OUTROS';
      contagem[modulo] = (contagem[modulo] || 0) + 1;
    });
  });

  const ordenado = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  rankingConteudo.innerHTML = ordenado.map(([mod, qtd]) => `
    <div class="flex justify-between items-center text-sm border-b border-gray-700 pb-1">
      <span class="font-medium">${mod}</span>
      <span class="bg-blue-600 px-2 py-0.5 rounded text-xs">${qtd} PRTs</span>
    </div>
  `).join('') || '<p class="text-xs text-gray-500">Sem dados</p>';
};

function exportarExcel() {
  const dados = obterDadosVisiveisTabela();
  if (!dados.length) return;
  const tabela = `
    <table>
      <tr><th>Release</th><th>PRT</th><th>Módulo</th></tr>
      ${dados.map(d => `<tr><td>${d.release}</td><td>${d.prt}</td><td>${d.modulo}</td></tr>`).join('')}
    </table>`;
  const blob = new Blob([tabela], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'liberacoes_filtradas.xls';
  a.click();
}

// Retorna o módulo com maior contagem (ou null)
function getTopModule(liberacoes) {
  const contagem = {};
  liberacoes.forEach(rel => {
    rel.protocolos.forEach(prt => {
      const mod = protocolosIndex[prt]?.modulo;
      if (!mod) return;
      contagem[mod] = (contagem[mod] || 0) + 1;
    });
  });
  const ordenado = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return ordenado.length ? ordenado[0][0] : null;
}

function renderizarGraficoTrendModulo(liberacoes, modulo) {
  const ctx = document.getElementById('chartTrendModulo');
  if (!ctx || typeof Chart === 'undefined') return;

  if (chartsInstance.chartTrendModulo) chartsInstance.chartTrendModulo.destroy();

  // Organiza releases e conta quantos protocolos daquele módulo aparecem em cada release
  const labels = liberacoes.map(r => r.release);
  const data = liberacoes.map(r => r.protocolos.filter(prt => (protocolosIndex[prt]?.modulo === modulo)).length);

  chartsInstance.chartTrendModulo = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Tendência - ${modulo}`,
        data: data,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.3,
        fill: true,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#9CA3AF' } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
        x: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } }
      }
    }
  });
}

function renderizarRankingModulos() {
  const liberacoes = obterLiberacoesFiltradasAtuais();
  const ranking = {};

  liberacoes.forEach(r => {
    r.protocolos.forEach(prt => {
      const modulo = protocolosIndex[prt]?.modulo;
      if (!modulo) return;
      ranking[modulo] = (ranking[modulo] || 0) + 1;
    });
  });

  // Converte ranking para estrutura com sets para tooltip
  const details = {};
  liberacoes.forEach(rel => {
    rel.protocolos.forEach(prt => {
      const modulo = protocolosIndex[prt]?.modulo;
      if (!modulo) return;
      if (!details[modulo]) details[modulo] = { count: 0, prts: new Set(), releases: new Set() };
      details[modulo].count += 1;
      details[modulo].prts.add(prt);
      details[modulo].releases.add(rel.release);
    });
  });

  const ordenado = Object.entries(details).sort((a, b) => b[1].count - a[1].count);

  const container = document.getElementById('ranking-modulos');
  if (!container) return;

  if (!ordenado.length) {
    container.innerHTML = `<p class="text-xs text-gray-500">Nenhum dado encontrado</p>`;
    return;
  }

  // Criar select para ajustar quantos ficam escalados (se ainda não existir)
  if (!document.getElementById('top-escalados-select')) {
    const header = container.previousElementSibling || container.parentElement.querySelector('h3');
    if (header) {
      const selectHtml = ` <select id="top-escalados-select" class="ml-3 bg-gray-800 text-sm text-gray-200 px-2 py-1 rounded">
        <option value="1">Top 1</option>
        <option value="3" selected>Top 3</option>
        <option value="5">Top 5</option>
      </select>`;
      header.insertAdjacentHTML('beforeend', selectHtml);

      const sel = document.getElementById('top-escalados-select');
      sel.value = String(topEscalados);
      sel.addEventListener('change', (e) => {
        topEscalados = Number(e.target.value) || 3;
        renderizarRankingModulos();
      });
    }
  }

  // Mostra ranking completo; destaca os topEscalados com ícone de escalção
  container.innerHTML = ordenado.map(([mod, info], i) => {
    const total = info.count;
    const isTop = i < topEscalados;
    const safeLabel = String(mod).replace(/'/g, "\\'");
    const tooltip = `${total} PRTs em ${info.releases.size} releases`;

    return `
      <div class="flex justify-between items-center text-sm ${isTop ? 'bg-gray-800 px-2 py-1 rounded-lg' : 'border-b border-gray-700 pb-1'}" title="${tooltip}">
        <div class="flex items-center gap-2">
          <button onclick="selecionarModulo('${safeLabel}')" class="text-gray-300 hover:underline text-left">${i + 1}. ${mod}</button>
          ${isTop ? `<button title="Alta ocorrência" onclick="selecionarModulo('${safeLabel}')" class="text-red-400"><i data-lucide="alert-triangle" class="w-4 h-4"></i></button>` : ''}
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold ${isTop ? 'text-red-400' : 'text-blue-400'}">${total}</span>
          <button title="Abrir lista filtrada" onclick="selecionarModulo('${safeLabel}')" class="text-sm text-gray-400 hover:text-gray-200">↪</button>
        </div>
      </div>
    `;
  }).join('');

  // Recria ícones Lucide (para o alert-triangle)
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

// Hook sem alterar renderizarDashboard
const _renderizarDashboardOriginal = renderizarDashboard;
renderizarDashboard = function (liberacoes) {
  _renderizarDashboardOriginal(liberacoes);
  setTimeout(() => {
    habilitarCliqueGraficoLiberacoes();
    renderizarRankingModulos(liberacoes);
    // Atualiza o nome exibido na seção de tendência
    const trendNameEl = document.getElementById('trend-modulo-name');
    if (trendNameEl) {
      const showModulo = (moduloSelecionado && moduloSelecionado !== 'TODOS') ? moduloSelecionado : getTopModule(liberacoes) || '—';
      trendNameEl.textContent = showModulo;
    }
  }, 200);
};

function obterLiberacoesFiltradasAtuais() {
  let dados = JSON.parse(JSON.stringify(liberacoesOriginais));

  // Filtro por módulo
  if (typeof moduloSelecionado !== 'undefined' && moduloSelecionado !== 'TODOS') {
    dados = dados.map(r => {
      r.protocolos = r.protocolos.filter(prt =>
        protocolosIndex[prt]?.modulo === moduloSelecionado
      );
      return r;
    }).filter(r => r.protocolos.length > 0);
  }

  // Busca
  if (typeof termoBusca !== 'undefined' && termoBusca.trim()) {
    const busca = termoBusca.toLowerCase();
    dados = dados.map(r => {
      r.protocolos = r.protocolos.filter(prt => {
        const info = protocolosIndex[prt];
        return (
          prt.toLowerCase().includes(busca) ||
          info?.modulo?.toLowerCase().includes(busca) ||
          info?.descricao?.toLowerCase().includes(busca)
        );
      });
      return r;
    }).filter(r => r.protocolos.length > 0);
  }

  return dados;
}

const _selecionarModuloOriginal = window.selecionarModulo;

window.selecionarModulo = function (modulo) {
  _selecionarModuloOriginal(modulo);

  const filtradas = obterLiberacoesFiltradasAtuais();
  renderizarTabelaLiberacoes(filtradas);
  renderizarRankingModulos(filtradas);

  // Atualiza o título da tendência e o gráfico de tendência
  const trendNameEl = document.getElementById('trend-modulo-name');
  if (trendNameEl) trendNameEl.textContent = modulo;
  if (typeof renderizarGraficoLiberacoes === 'function') {
    renderizarGraficoLiberacoes(filtradas);
    renderizarGraficoTop5(filtradas);
    renderizarGraficoEvolucao(filtradas);
    renderizarGraficoTrendModulo(filtradas, modulo);
  }
};

// Debounce timer usado pela busca
let buscaDebounceTimer = null;

// Inicializa o campo de busca que filtra por PRT, módulo ou descrição
function inicializarBuscaModulo() {
  const input = document.getElementById('busca-modulo');
  if (!input) return;

  input.addEventListener('input', (e) => {
    clearTimeout(buscaDebounceTimer);
    buscaDebounceTimer = setTimeout(() => {
      window.termoBusca = e.target.value || '';
      const filtradas = obterLiberacoesFiltradasAtuais();
      renderizarTabelaLiberacoes(filtradas);
      renderizarRankingModulos(filtradas);
      if (typeof renderizarGraficoLiberacoes === 'function') {
        renderizarGraficoLiberacoes(filtradas);
        renderizarGraficoTop5(filtradas);
        renderizarGraficoEvolucao(filtradas);
      }
    }, 200);
  });

  // Permite limpar a busca com ESC
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
  });

  // Aplica filtro inicial se houver valor pré-preenchido
  if (input.value && input.value.trim()) {
    input.dispatchEvent(new Event('input'));
  }
}
