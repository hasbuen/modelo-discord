const ESTADOS = [
    { uf: 'AC', nome: 'Acre' },
    { uf: 'AL', nome: 'Alagoas' },
    { uf: 'AP', nome: 'Amapá' },
    { uf: 'AM', nome: 'Amazonas' },
    { uf: 'BA', nome: 'Bahia' },
    { uf: 'CE', nome: 'Ceará' },
    { uf: 'DF', nome: 'Distrito Federal' },
    { uf: 'ES', nome: 'Espírito Santo' },
    { uf: 'GO', nome: 'Goiás' },
    { uf: 'MA', nome: 'Maranhão' },
    { uf: 'MT', nome: 'Mato Grosso' },
    { uf: 'MS', nome: 'Mato Grosso do Sul' },
    { uf: 'MG', nome: 'Minas Gerais' },
    { uf: 'PA', nome: 'Pará' },
    { uf: 'PB', nome: 'Paraíba' },
    { uf: 'PR', nome: 'Paraná' },
    { uf: 'PE', nome: 'Pernambuco' },
    { uf: 'PI', nome: 'Piauí' },
    { uf: 'RJ', nome: 'Rio de Janeiro' },
    { uf: 'RN', nome: 'Rio Grande do Norte' },
    { uf: 'RS', nome: 'Rio Grande do Sul' },
    { uf: 'RO', nome: 'Rondônia' },
    { uf: 'RR', nome: 'Roraima' },
    { uf: 'SC', nome: 'Santa Catarina' },
    { uf: 'SP', nome: 'São Paulo' },
    { uf: 'SE', nome: 'Sergipe' },
    { uf: 'TO', nome: 'Tocantins' },
    { uf: 'SVAN', nome: 'Sefaz Virtual Ambiente Nacional' },
    { uf: 'SVRS', nome: 'Sefaz Virtual Rio Grande do Sul' },
];

let autoRefreshInterval = null;
let tempoMedioChartInstance = null;
let chartData = []; 
let favoritoRefreshInterval = null;
let ufFavorita = ''; 
let currentView = 'cards';

// Aumentamos para 30 pontos, pois a atualização é a cada 1 segundo (30s de histórico)
const CHART_MAX_POINTS = 30; 

// =========================================================
// Funções de Utilitário e Status
// =========================================================

function getStatusIconHTML(status) {
    let iconName, colorClass;
    switch (status) {
        case 'online':
            iconName = 'check-circle';
            colorClass = 'text-green-500';
            break;
        case 'instavel':
            iconName = 'alert-circle';
            colorClass = 'text-yellow-500';
            break;
        case 'offline':
            iconName = 'x-circle';
            colorClass = 'text-red-500';
            break;
        default:
            iconName = 'help-circle';
            colorClass = 'text-gray-400';
    }
    return `<i data-lucide="${iconName}" class="w-5 h-5 ${colorClass}"></i>`;
}

function getStatusBadgeHTML(status) {
    const styles = {
        online: 'bg-green-700 text-white',
        instavel: 'bg-yellow-700 text-white',
        offline: 'bg-red-700 text-white',
    };
    const labels = {
        online: 'Disponível',
        instavel: 'Instável',
        offline: 'Indisponível',
    };

    return `
        <span class="px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-500 text-white'}">
            ${labels[status] || 'Desconhecido'}
        </span>
    `;
}

function getOverallStatus(services) {
    if (services.length === 0) return { status: 'unknown', count: 0, total: 0 };

    const online = services.filter(s => s.autorizacao === 'online' && s.nfce === 'online').length;
    const total = services.length;
    const percentage = (online / total) * 100;

    let status;
    if (percentage >= 90) {
        status = 'online';
    } else if (percentage >= 70) {
        status = 'instavel';
    } else {
        status = 'offline';
    }

    return { status, count: online, total };
}

// =========================================================
// Funções de Renderização (Tabela e Cards)
// ... (MANTIDAS DA RESPOSTA ANTERIOR)
// =========================================================

function renderTableView(mockData) {
    const tableBody = document.getElementById('services-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = mockData.map((service, index) => {
        const rowClass = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900';
        return `
            <tr class="${rowClass} hover:bg-gray-700 transition-colors">
                <td class="px-4 py-3 text-sm font-bold text-blue-400 sticky left-0 ${rowClass}">${service.uf}</td>
                <td class="px-4 py-3 text-sm text-gray-300">${service.nome}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusIconHTML(service.autorizacao)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusIconHTML(service.retAutorizacao)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusIconHTML(service.consultaProtocolo)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusIconHTML(service.inutilizacao)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusIconHTML(service.consultaCadastro)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusIconHTML(service.recepcaoEvento)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusBadgeHTML(service.statusServico)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center">${getStatusIconHTML(service.nfce)}</div>
                </td>
                <td class="px-4 py-3 text-center text-sm text-gray-400">
                    ${service.tempoMedio}ms
                </td>
            </tr>
        `;
    }).join('');
}

function renderCardsView(mockData) {
    const cardsContainer = document.getElementById('sefaz-view-cards');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = mockData.map(service => {
        const statuses = [
            service.autorizacao, 
            service.retAutorizacao, 
            service.consultaProtocolo, 
            service.statusServico, 
            service.nfce,
            service.inutilizacao,
            service.consultaCadastro,
            service.recepcaoEvento
        ];
        let cardColor = 'bg-green-800 border-green-700';
        let cardIcon = 'check-circle';
        
        if (statuses.includes('offline')) {
            cardColor = 'bg-red-800 border-red-700';
            cardIcon = 'x-circle';
        } else if (statuses.includes('instavel')) {
            cardColor = 'bg-yellow-800 border-yellow-700';
            cardIcon = 'alert-triangle';
        }

        return `
            <div class="bg-gray-800 p-4 rounded-xl shadow-lg border ${cardColor} transition hover:shadow-xl">
                <div class="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                    <h3 class="text-xl font-bold text-white">${service.uf}</h3>
                    <i data-lucide="${cardIcon}" class="w-6 h-6 text-white"></i>
                </div>
                <p class="text-sm text-gray-400 mb-2">${service.nome}</p>

                <div class="space-y-1">
                    <div class="flex items-center justify-between text-sm text-gray-300">
                        <span>Autorização NF-e:</span>
                        ${getStatusIconHTML(service.autorizacao)}
                    </div>
                    <div class="flex items-center justify-between text-sm text-gray-300">
                        <span>Consulta Protocolo:</span>
                        ${getStatusIconHTML(service.consultaProtocolo)}
                    </div>
                    <div class="flex items-center justify-between text-sm text-gray-300">
                        <span>Inutilização:</span>
                        ${getStatusIconHTML(service.inutilizacao)}
                    </div>
                    <div class="flex items-center justify-between text-sm text-gray-300">
                        <span>NFC-e:</span>
                        ${getStatusIconHTML(service.nfce)}
                    </div>
                    <div class="flex items-center justify-between text-sm text-gray-300 pt-1 border-t border-gray-700">
                        <span class="font-semibold">Serviço Geral:</span>
                        ${getStatusBadgeHTML(service.statusServico)}
                    </div>
                </div>
                <p class="text-xs text-gray-500 mt-2 text-right">
                    Tempo Médio: ${service.tempoMedio}ms
                </p>
            </div>
        `;
    }).join('');
}


// =========================================================
// Funções de Gráfico de Desempenho (AGORA FOCADO NA UF FAVORITA)
// =========================================================

function initializeTempoMedioChart() {
    const ctx = document.getElementById('tempoMedioChart').getContext('2d');
    
    // Inicializa chartData com valores iniciais ou zeros
    for (let i = 0; i < CHART_MAX_POINTS; i++) { 
        chartData.push({ time: '', value: 0 });
    }

    tempoMedioChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.time),
            datasets: [{
                label: 'Tempo Médio (ms)', // O rótulo da UF é no título
                data: chartData.map(d => d.value),
                borderColor: 'rgba(59, 130, 246, 1)', 
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            maintainAspectRatio: false,
            animation: {
                duration: 0 // Desativa animação para parecer mais em tempo real
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Tempo (ms)',
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: '#374151' 
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9CA3AF',
                        maxRotation: 0,
                        minRotation: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                    titleColor: '#FFFFFF',
                    bodyColor: '#D1D5DB'
                }
            }
        }
    });
}

/**
 * Atualiza o título do gráfico dinamicamente.
 */
function updateChartTitle(ufName) {
    const titleEl = document.getElementById('chart-uf-title');
    if (titleEl) {
        if (!ufName || ufName === 'Global') {
             titleEl.textContent = '(Global - Média Geral)';
             titleEl.classList.remove('text-yellow-400');
             titleEl.classList.add('text-blue-400');
        } else {
             titleEl.textContent = `(${ufName})`;
             titleEl.classList.remove('text-blue-400');
             titleEl.classList.add('text-yellow-400');
        }
    }
}

/**
 * Adiciona um novo ponto ao gráfico (Tempo Médio da UF Favorita) ou reseta o gráfico.
 * @param {string} newTime Hora da atualização.
 * @param {number} newAverageTime Novo valor de tempo médio.
 * @param {boolean} reset Se deve limpar os dados do gráfico.
 */
function updateTempoMedioChart(newTime, newAverageTime, reset = false) {
    if (reset) {
        chartData = []; 
        for (let i = 0; i < CHART_MAX_POINTS; i++) {
            chartData.push({ time: '', value: 0 }); 
        }
    } else {
        if (chartData.length >= CHART_MAX_POINTS) {
            chartData.shift();
        }
        
        chartData.push({ time: newTime, value: newAverageTime });
    }

    if (tempoMedioChartInstance) {
        tempoMedioChartInstance.data.labels = chartData.map(d => d.time);
        tempoMedioChartInstance.data.datasets[0].data = chartData.map(d => d.value);
        tempoMedioChartInstance.update();
    }
}


// =========================================================
// Funções de Monitoramento Principal (30s)
// =========================================================

window.toggleView = function (view) {
    const cardsView = document.getElementById('sefaz-view-cards');
    const tableView = document.getElementById('sefaz-view-table');
    const btnCards = document.getElementById('btn-view-cards');
    const btnTable = document.getElementById('btn-view-table');

    if (currentView === view) return; 

    if (view === 'cards') {
        cardsView?.classList.remove('hidden');
        tableView?.classList.add('hidden');
        btnCards?.classList.add('bg-blue-600', 'hover:bg-blue-700');
        btnCards?.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        btnTable?.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btnTable?.classList.add('bg-gray-700', 'hover:bg-gray-600');
        currentView = 'cards';
    } else if (view === 'table') {
        cardsView?.classList.add('hidden');
        tableView?.classList.remove('hidden');
        btnTable?.classList.add('bg-blue-600', 'hover:bg-blue-700');
        btnTable?.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        btnCards?.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btnCards?.classList.add('bg-gray-700', 'hover:bg-gray-600');
        currentView = 'table';
    }
    
    // Chama fetchStatus para popular a nova view
    window.fetchStatus(); 
};

window.fetchStatus = async function () {
    const tableBody = document.getElementById('services-table-body');
    const cardsContainer = document.getElementById('sefaz-view-cards');
    const refreshButton = document.getElementById('btn-fetch-status');
    const refreshIcon = document.getElementById('icon-refresh');

    const loadingHtml = `
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block mr-2 text-blue-500"></i>
        Carregando status dos serviços...
    `;

    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="11" class="px-4 py-8 text-center text-gray-400">${loadingHtml}</td></tr>`;
    }
    if (cardsContainer) {
        cardsContainer.innerHTML = `<div class="px-4 py-8 text-center text-gray-400 col-span-full">${loadingHtml}</div>`;
    }
    
    if (refreshButton) refreshButton.disabled = true;
    if (refreshIcon) refreshIcon.classList.add('animate-spin');

    await new Promise(resolve => setTimeout(resolve, 200));

    const mockData = ESTADOS.map(estado => {
        const generateStatus = () => {
            const r = Math.random();
            if (r > 0.15) return 'online';
            if (r > 0.05) return 'instavel';
            return 'offline';
        };

        return {
            uf: estado.uf,
            nome: estado.nome,
            autorizacao: generateStatus(),
            retAutorizacao: generateStatus(),
            consultaProtocolo: generateStatus(),
            inutilizacao: generateStatus(),
            consultaCadastro: generateStatus(),
            recepcaoEvento: generateStatus(),
            statusServico: generateStatus(),
            tempoMedio: Math.floor(Math.random() * 3000) + 500,
            nfce: Math.random() > 0.1 ? 'online' : 'offline', 
        };
    });

    if (currentView === 'cards') {
        renderCardsView(mockData);
    } else {
        renderTableView(mockData);
    }

    const overall = getOverallStatus(mockData);
    const now = new Date();
    
    // O gráfico NÃO É MAIS ATUALIZADO AQUI, mas o status geral sim
    document.getElementById('overall-status-count').innerText = `${overall.count}/${overall.total}`;

    const overallIconContainer = document.getElementById('overall-status-icon');
    if (overallIconContainer) {
        overallIconContainer.innerHTML = getStatusIconHTML(overall.status);
    }

    document.getElementById('last-update-time').innerText = now.toLocaleTimeString('pt-BR');
    document.getElementById('last-update-date').innerText = now.toLocaleDateString('pt-BR');

    if (refreshButton) refreshButton.disabled = false;
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

function setupAutoRefresh() {
    const startInterval = () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        // Intervalo principal de 30 segundos
        autoRefreshInterval = setInterval(window.fetchStatus, 30000); 
    };

    startInterval();
}


// =========================================================
// Funções de Monitoramento Favorito (1s) - AGORA ATUALIZA O GRÁFICO
// =========================================================

function loadUfFavorita() {
    const select = document.getElementById('uf-favorita-select');
    if (!select) return;

    // Preenche o Select
    if (select.options.length <= 1) { 
        ESTADOS.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado.uf;
            option.textContent = `${estado.uf} - ${estado.nome}`;
            select.appendChild(option);
        });
    }

    // Carrega do localStorage
    const savedUf = localStorage.getItem('sefazUfFavorita');
    if (savedUf && ESTADOS.some(e => e.uf === savedUf)) {
        ufFavorita = savedUf;
        select.value = savedUf;
        
        startFavoritoMonitor();
    } else {
        ufFavorita = '';
        updateFavoritoDisplay(null);
        updateChartTitle('Global'); // Título padrão
        updateTempoMedioChart(null, 0, true); // Reseta o gráfico
    }
}

window.salvarUfFavorita = function (uf) {
    if (uf) {
        const estadoInfo = ESTADOS.find(e => e.uf === uf);
        localStorage.setItem('sefazUfFavorita', uf);
        ufFavorita = uf;
        startFavoritoMonitor(); // Inicia monitor (1s)
    } else {
        localStorage.removeItem('sefazUfFavorita');
        ufFavorita = '';
        stopFavoritoMonitor();
        updateFavoritoDisplay(null);
        updateChartTitle('Global'); // Título padrão
        updateTempoMedioChart(null, 0, true); // Reseta o gráfico
    }
};

function startFavoritoMonitor() {
    stopFavoritoMonitor();
    window.fetchStatusFavorito(); 
    favoritoRefreshInterval = setInterval(window.fetchStatusFavorito, 1000); // 1 segundo
}

function stopFavoritoMonitor() {
    if (favoritoRefreshInterval) {
        clearInterval(favoritoRefreshInterval);
        favoritoRefreshInterval = null;
    }
}

window.fetchStatusFavorito = function () {
    if (!ufFavorita) {
        stopFavoritoMonitor();
        updateFavoritoDisplay(null);
        updateChartTitle('Global');
        return;
    }

    const generateQuickStatus = () => {
        const r = Math.random();
        if (r > 0.1) return 'online';
        if (r > 0.05) return 'instavel';
        return 'offline';
    };

    const estadoInfo = ESTADOS.find(e => e.uf === ufFavorita);

    const favoritoData = {
        uf: ufFavorita,
        nome: estadoInfo ? estadoInfo.nome : 'UF Desconhecida',
        autorizacao: generateQuickStatus(),
        retAutorizacao: generateQuickStatus(),
        tempoMedio: Math.floor(Math.random() * 500) + 50,
    };
    
    const now = new Date();

    updateFavoritoDisplay(favoritoData);
    
    // **NOVO:** Atualiza o título e o gráfico com os dados da UF Favorita (a cada 1s)
    updateChartTitle(`${favoritoData.uf} - ${favoritoData.nome}`);
    updateTempoMedioChart(now.toLocaleTimeString('pt-BR'), favoritoData.tempoMedio);

};

function updateFavoritoDisplay(data) {
    const nomeEl = document.getElementById('favorito-uf-nome');
    const autIconEl = document.getElementById('favorito-aut-icon');
    const retIconEl = document.getElementById('favorito-ret-icon');
    const tempoMedioEl = document.getElementById('favorito-tempo-medio');
    const displayEl = document.getElementById('favorito-status-display');

    if (nomeEl && autIconEl && retIconEl && tempoMedioEl && displayEl) {
        if (data) {
            nomeEl.textContent = data.uf;
            autIconEl.innerHTML = getStatusIconHTML(data.autorizacao);
            retIconEl.innerHTML = getStatusIconHTML(data.retAutorizacao);
            tempoMedioEl.textContent = `${data.tempoMedio}ms`;
            displayEl.style.borderColor = 'rgb(59, 130, 246)'; 
        } else {
            nomeEl.textContent = 'Nenhuma UF selecionada';
            autIconEl.innerHTML = getStatusIconHTML('unknown');
            retIconEl.innerHTML = getStatusIconHTML('unknown');
            tempoMedioEl.textContent = '--ms';
            displayEl.style.borderColor = 'rgb(75, 85, 99)'; 
        }
    }
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}


// =========================================================
// Inicialização
// =========================================================

function initSefazMonitor() {
    initializeTempoMedioChart(); 
    loadUfFavorita(); // Chama loadUfFavorita ANTES do fetchStatus, pois ele define o que o gráfico mostra
    window.toggleView(currentView); 
    setupAutoRefresh(); 
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pagina-sefaz')) {
        initSefazMonitor();
    }
});