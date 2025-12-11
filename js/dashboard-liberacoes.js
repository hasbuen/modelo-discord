/**
 * Dashboard de Histórico de Liberações
 * Carrega dados e renderiza gráficos Chart.js
 */

let chartsInstance = {
  chartLiberacoes: null,
  chartTop5: null,
  chartEvolucao: null
};

/**
 * Carrega dados das liberações a partir da API
 */
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
function renderizarTabela(liberacoes) {
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
  renderizarTabela(liberacoes);
  
  // Aguarda um tempo para garantir que Chart.js está disponível
  setTimeout(() => {
    try {
      if (typeof Chart !== 'undefined') {
        renderizarGraficoLiberacoes(liberacoes);
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

  const liberacoes = await carregarDadosLiberacoes();
  renderizarDashboard(liberacoes);
}

// Expõe funções globalmente
window.carregarHistoricoLiberacoes = carregarHistoricoLiberacoes;
window.processarArquivoRTF = processarArquivoRTF;
