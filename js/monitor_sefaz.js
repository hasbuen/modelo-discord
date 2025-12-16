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

// =========================================================
// Funções de Renderização e Status
// =========================================================

/**
 * Retorna o HTML do ícone Lucide baseado no status.
 */
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

/**
 * Retorna o HTML do badge de status do serviço.
 */
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


window.fetchStatus = async function () {
    const tableBody = document.getElementById('services-table-body');
    const refreshButton = document.getElementById('btn-fetch-status');
    const refreshIcon = document.getElementById('icon-refresh');

    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-400">
                    <i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block mr-2 text-blue-500"></i>
                    Carregando status dos serviços...
                </td>
            </tr>
        `;
    }
    if (refreshButton) refreshButton.disabled = true;
    if (refreshIcon) refreshIcon.classList.add('animate-spin');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const mockData = ESTADOS.map(estado => {
        // Correção das probabilidades para simular uma situação mais normal
        const generateStatus = () => {
            const r = Math.random();
            if (r > 0.15) return 'online';      // ~85% de chance de Online (Mais realista)
            if (r > 0.05) return 'instavel';    // ~10% de chance de Instável
            return 'offline';                   // ~5% de chance de Offline
        };

        return {
            uf: estado.uf,
            nome: estado.nome,
            autorizacao: generateStatus(),
            retAutorizacao: generateStatus(),
            consultaProtocolo: generateStatus(),
            statusServico: generateStatus(),
            tempoMedio: Math.floor(Math.random() * 3000) + 500,
            nfce: Math.random() > 0.1 ? 'online' : 'offline', // Aumenta chance de NFC-e online
        };
    });

    if (tableBody) {
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

    const overall = getOverallStatus(mockData);
    const now = new Date();

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
    const toggle = document.getElementById('toggle-auto-refresh');

    const startInterval = () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(window.fetchStatus, 60000);
    };

    const stopInterval = () => {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    };

    const handleToggle = (e) => {
        if (e.target.checked) {
            startInterval();
        } else {
            stopInterval();
        }
    };

    if (toggle) {
        toggle.addEventListener('change', handleToggle);

        if (toggle.checked) {
            startInterval();
        }
    }
}

function initSefazMonitor() {
    window.fetchStatus();
    setupAutoRefresh();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pagina-sefaz')) {
        initSefazMonitor();
    }
});