
// Mensagens
const MENSAGEM_1 = "Selecione o tipo do protocolo!";
const MENSAGEM_2 = "Preencha todos os campos!";
const MENSAGEM_3 = "Por favor, insira um link válido!";
const MENSAGEM_4 = "Nenhum texto para copiar!";
const MENSAGEM_5 = "Texto copiado e registrado com sucesso!";
const MENSAGEM_6 = "Erro ao copiar o texto!";
const MENSAGEM_7 = "O protocolo deve conter apenas números!";
const MENSAGEM_8 = "O ticket deve conter apenas números!";
const MENSAGEM_9 = "Trâmite copiado com sucesso!";

// Paleta de cores para os módulos (suficiente para cerca de 30 módulos)
const CORES_GRAFICO = [
  '#39FF14', '#00FFFF', '#FFFD37', '#7C00FF', '#00B7FF', '#F000FF', '#00FF7F', '#FF6EC7',
  '#A6FF00', '#09FBD3', '#00FFEF', '#4D4DFF', '#3600FF', '#00FFC8', '#2BFF00', '#80FF00'
];

let registrosCache = [];

// Seleção de tipo com badges
function selecionarTipo(tipo) {

  const hiddenInput = document.getElementById("tipo");
  const selectModulo = document.getElementById("modulo");
  const setaModulo = document.getElementById("seta-modulo");

  hiddenInput.value = tipo;

  // 1. Reset de classes anteriores
  selectModulo.classList.remove('focus:border-red-500', 'focus:ring-red-500/20', 'hover:border-red-600');
  selectModulo.classList.remove('focus:border-green-500', 'focus:ring-green-500/20', 'hover:border-green-600');
  selectModulo.classList.remove('focus:border-gray-500', 'focus:ring-gray-500/20', 'hover:border-gray-400');
  setaModulo.classList.remove('text-red-500', 'text-green-500', 'text-gray-400');

  // 2. Aplica as novas cores baseadas no tipo
  if (tipo === 'erro') {
    selectModulo.classList.add('focus:border-red-500', 'focus:ring-red-500/20', 'hover:border-red-600');
    setaModulo.classList.add('text-red-500');
  } else if (tipo === 'sugestao') {
    selectModulo.classList.add('focus:border-green-500', 'focus:ring-green-500/20', 'hover:border-green-600');
    setaModulo.classList.add('text-green-500');
  } else {
    // Caso neutro (cinza)
    selectModulo.classList.add('focus:border-gray-500', 'focus:ring-gray-500/20', 'hover:border-gray-400');
    setaModulo.classList.add('text-gray-400');
  }

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

  const moduloId = document.getElementById('modulo').value;
  const prt = document.getElementById('prt');
  const ticket = document.getElementById('ticket');
  const descricao = document.getElementById('descricao');
  const paliativo = document.getElementById('paliativo');
  const prazo = document.getElementById('prazo');
  const link = document.getElementById('link');
  const campos = [prt, ticket, descricao, paliativo, prazo, link];

  if (moduloId === "") return exibirModal("Selecione o módulo!", "", "erro");
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
    texto = `**\`\`\`diff
+ Protocolo [SUGESTÃO]:
+ PRT: ${prt.value}
+ Ticket: ${ticket.value}
\`\`\`**
- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}
`;
  } else {
    texto = `**\`\`\`diff
- Protocolo [ERRO]:
- PRT: ${prt.value}
- Ticket: ${ticket.value}
\`\`\`**
- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}
`;
  }

  document.getElementById('output').value = texto;
}

async function salvarRegistro() {
  const tipo = document.getElementById("tipo").value;
  const modulo = parseInt(document.getElementById("modulo").value);
  const prt = "#PRT" + document.getElementById("prt").value.trim();
  const ticket = "#" + document.getElementById("ticket").value.trim();
  const descricao = document.getElementById("descricao").value.trim();
  const paliativo = document.getElementById("paliativo").value.trim();
  const link = document.getElementById("link").value.trim();

  const registros = await carregarRegistrosProtocolos();
  if (registros.some(r => r.prt === prt)) return exibirModal("Já gravado!", prt, "info");

  const registro = { tipo: tipo === "erro" ? 0 : 1, prt, ticket, descricao, paliativo, link, modulo };

  try {
    await fetch('https://modelo-discord-server.vercel.app/api/protocolos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registro)
    });
    exibirModal(MENSAGEM_5, "", "sucesso");
    limparCampos();
    await renderizarTabela();
  } catch (err) {
    exibirModal("Erro ao salvar registro.", "", "erro");
    console.error(err);
  }
}

function copiarTexto() {
  const texto = document.getElementById('output').value;
  if (!texto.trim()) return exibirModal(MENSAGEM_4, "", "info");
  navigator.clipboard.writeText(texto)
    .then(() => {
      salvarRegistro();
    })
    .catch(() => exibirModal(MENSAGEM_6, "", "erro"));
}

function limparCampos() {
  document.getElementById('modulo').value = '';
  document.getElementById('prt').value = '';
  document.getElementById('ticket').value = '';
  document.getElementById('descricao').value = '';
  document.getElementById('paliativo').value = '';
  document.getElementById('prazo').value = '';
  document.getElementById('link').value = '';
  document.getElementById('output').value = '';
  document.getElementById("btn-erro").classList.remove("ring-2", "ring-offset-2", "ring-red-400");
  document.getElementById("btn-sugestao").classList.remove("ring-2", "ring-offset-2", "ring-green-400");
  document.getElementById("tipo").value = '';
}

async function popularModulosSelect() {
  const select = document.getElementById('modulo');
  if (!select) return;

  const modulos = await carregarModulos();

  if (modulos.length === 0) {
    select.innerHTML = '<option value="">Erro ao carregar módulos</option>';
    return;
  }

  select.innerHTML = '<option value=""> </option>';

  modulos.forEach(m => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = m.modulo;
    select.appendChild(option);
  });
}

// Tabela
function filtrarTabela() {
  const f = document.getElementById("busca").value.toLowerCase();
  document.querySelectorAll("#tabelaRegistros tbody tr").forEach(tr => {
    tr.style.display = [...tr.children].some(td => td.textContent.toLowerCase().includes(f)) ? "" : "none";
  });
}

let ultimaColuna = -1, ordemAsc = true;
function ordenarTabela(idx) {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  let linhas = [...tbody.querySelectorAll("tr")];
  if (ultimaColuna === idx) ordemAsc = !ordemAsc; else { ordemAsc = true; ultimaColuna = idx; }
  linhas.sort((a, b) => {
    let va = a.children[idx].textContent.trim().toLowerCase();
    let vb = b.children[idx].textContent.trim().toLowerCase();
    return ordemAsc ? va.localeCompare(vb) : vb.localeCompare(a);
  });
  linhas.forEach(l => tbody.appendChild(l));
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



function copiarLinha(botao, reg) {
  let objetoJson;

  try {
    objetoJson = JSON.parse(JSON.stringify(reg).replace(/\\"/g, '"').replace(/(^"|"$)/g, ''));
  } catch (e) {
    console.error("Erro ao converter para JSON:", e);
  }

  let texto = "";
  if (objetoJson.Tipo === 'Sugestão') {
    texto = `**\`\`\`diff
+ Protocolo [SUGESTÃO]:
+ PRT: ${objetoJson.PRT}
+ Ticket: ${objetoJson.Ticket}
\`\`\`**
- **Descrição resumida:**
${objetoJson.Descricao}

- **Paliativo:**
${objetoJson.Paliativo}
`;
  } else {
    texto = `**\`\`\`diff
- Protocolo [ERRO]:
- PRT: ${objetoJson.PRT}
- Ticket: ${objetoJson.Ticket}
\`\`\`**
- **Descrição resumida:**
${objetoJson.Descricao}

- **Paliativo:**
${objetoJson.Paliativo}
`;
  }

  navigator.clipboard.writeText(texto.trim())
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
/*
function copiarLinha(botao, reg) {
  let objetoJson;
  try {
    objetoJson = JSON.parse(JSON.stringify(reg).replace(/\\"/g, '"').replace(/(^"|"$)/g, ''));
  } catch (e) {
    console.error("Erro ao converter para JSON:", e);
  }

  let texto = "";
  if (objetoJson.tipo === '1') {
    texto = `**\`\`\`diff
+ Protocolo [SUGESTÃO]:
+ PRT: ${objetoJson.PRT}
+ Ticket: ${objetoJson.Ticket}
\`\`\`**
- **Descrição resumida:**
${objetoJson.Descricao}

- **Paliativo:**
${objetoJson.Paliativo}
`;
  } else {
    texto = `**\`\`\`diff
- Protocolo [ERRO]:
- PRT: ${objetoJson.PRT}
- Ticket: ${objetoJson.Ticket}
\`\`\`**
- **Descrição resumida:**
${objetoJson.Descricao}

- **Paliativo:**
${objetoJson.Paliativo}
`;
  }

  navigator.clipboard.writeText(texto.trim())
    .then(() => {
      const originalText = botao.innerHTML;
      botao.innerHTML = "OK";
      setTimeout(() => {
        botao.innerHTML = originalText;
        lucide.createIcons();
      }, 1000);
    })
    .catch(() => exibirModal("Erro ao copiar o paliativo.", "", "erro"));
}*/

async function abrirModalExclusao(id, ticket) {
  const modal = document.getElementById("confirmModal");
  const confirmBtn = document.getElementById("confirmBtn");

  document.getElementById("confirmIcon").innerHTML = `<i data - lucide="trash-2" class="text-red-500 w-5 h-5" ></i > `;
  document.getElementById("confirmText").textContent = `Tem certeza que deseja excluir o registro do ticket ${ticket}?`;

  confirmBtn.onclick = async () => {
    fecharConfirmModal();

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
  document.getElementById('card-total-registrado').innerText = registrosCache.length;

  erroEl.classList.remove("skeleton");
  sugestaoEl.classList.remove("skeleton");

  erroEl.textContent = totalErros;
  sugestaoEl.textContent = totalSugestoes;
}

async function carregarModulos() {
  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/modulos");
    return await res.json();
  } catch {
    return [];
  }
}

function montarGraficoModulos(registros, modulos) {
  const contagem = {};
  registros.forEach(r => {
    const id = String(r.modulo || '0');
    contagem[id] = (contagem[id] || 0) + 1;
  });

  const labels = [];
  const valores = [];

  Object.keys(contagem).forEach(id => {
    const modulo = modulos.find(m => String(m.id) === id);
    const nome = modulo ? modulo.modulo : "Desconhecido";
    labels.push(nome);
    valores.push(contagem[id]);
  });

  const coresDoModulo = labels.map((_, index) => CORES_GRAFICO[index % CORES_GRAFICO.length]);

  if (window.graficoModulos) {
    window.graficoModulos.destroy();
  }

  const canvas = document.getElementById("grafico-modulos");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  window.graficoModulos = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        borderWidth: 0,
        backgroundColor: coresDoModulo,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      elements: {
        arc: {
          hoverOffset: 20,
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: '#1f2937',
          titleColor: '#ffffff',
          bodyColor: '#cccccc',
        }
      },

      animation: {
        duration: 250,
      }
    },
  });

  criarLegendaModulos(window.graficoModulos);
}

function criarLegendaModulos(chart) {
  const legendaContainer = document.getElementById('legenda-modulos');
  if (!legendaContainer || !chart) return;

  legendaContainer.innerHTML = '';

  const labels = chart.data.labels || [];
  const backgroundColors = chart.data.datasets && chart.data.datasets[0]
    ? chart.data.datasets[0].backgroundColor
    : [];

  if (labels.length === 0) {
    legendaContainer.innerHTML = '<p class="text-gray-400">Nenhum dado disponível para a legenda.</p>';
    return;
  }

  labels.forEach((label, index) => {
    const color = backgroundColors[index] || '#999';

    const item = document.createElement('span');
    item.className = 'flex items-center space-x-1 p-1 rounded-md transition duration-150 cursor-pointer hover:bg-gray-700';
    item.dataset.index = String(index);

    const colorIndicator = document.createElement('span');
    colorIndicator.className = 'w-15 h-15 rounded-full flex-shrink-0';
    colorIndicator.style.backgroundColor = color;

    const text = document.createElement('span');
    text.className = 'text-gray-300 whitespace-nowrap';
    text.textContent = label;

    item.appendChild(colorIndicator);
    item.appendChild(text);

    item.addEventListener('mouseover', () => {
      const idx = parseInt(item.dataset.index, 10);
      if (isNaN(idx) || idx < 0) return;
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      chart.update('none');
    });

    item.addEventListener('mouseout', () => {
      chart.setActiveElements([]);
      if (chart.tooltip) {
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      }
      chart.update('none');
    });

    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.index, 10);
      const current = chart.getActiveElements && chart.getActiveElements()[0];
      if (current && current.index === idx) {
        chart.setActiveElements([]);
      } else {
        chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      }
      chart.update('none');
    });

    legendaContainer.appendChild(item);
  });
}

async function renderizarTabela() {
  const tbody = document.querySelector("#tabelaRegistros tbody");
  registrosCache = [];

  tbody.innerHTML = `
      <tr>
      <td colspan="5" class="text-center py-6 text-gray-400">
        <div class="flex items-center justify-center space-x-2">
          <div class="relative w-8 h-8 rounded-full">
            <div class="absolute inset-0 rounded-full border-2 border-transparent" style="background: linear-gradient(90deg, #1a1a1a 0%, #2e2e2e 20%, #444444 40%, #5a5a5a 60%, #444444 80%, #2e2e2e 90%, #1a1a1a 100%); animation: spin-soft 1.5s ease-in-out infinite;"></div>
            <div class="absolute inset-1 bg-gray-900 rounded-full"></div>
          </div>
          <span class="text-white text-lg">Aguarde, em instantes...</span>
        </div>
      </td>
    </tr> `;

  try {
    // Cria uma Promise para o timer (2 segundos)
    const timerPromise = new Promise(resolve => setTimeout(resolve, 6000)); // 2000ms = 2 segundos

    // Executa as requisições e o timer em paralelo
    const [registros,] = await Promise.all([
      carregarRegistrosProtocolos(),
      timerPromise // Garante que o loading apareça por no mínimo 2 segundos
    ]);

    await atualizarContadoresDosCards(registros);

    // FIM DO LOADING: Limpa o conteúdo de loading antes de renderizar os dados
    tbody.innerHTML = "";

    // Mensagem quando não há registros
    if (!registros || registros.length === 0) {
      tbody.innerHTML = `
      <tr>
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
                  onclick="copiarLinha(this, '${reg}')">
            <i data-lucide="copy" class="w-4 h-4"></i>
          </button>
          <button class="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      `;

      const btnExcluir = tr.querySelector('.bg-red-600');
      if (btnExcluir) {
        btnExcluir.onclick = () => abrirModalExclusao(Number(reg.id), reg.ticket);
      }

      tbody.appendChild(tr);
    });

    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error("Erro ao carregar registros:", error);
    tbody.innerHTML = `
      <tr>
      <td colspan="5" class="text-center py-6 text-red-400">
        Erro ao carregar os dados. Por favor, tente novamente.
      </td>
      </tr>
      `;
  }
}

async function enviarPergunta() {
  const input = document.getElementById("chat-input");
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const loadingMessage = document.getElementById("loading-message");

  // 1. Exibir a mensagem do usuário
  exibirMensagem("user", pergunta);
  input.value = "";

  // 2. Exibir a mensagem de "Pensando..." e rolar o chat para baixo
  loadingMessage.classList.remove("hidden");
  const chat = document.getElementById("chat-container");
  chat.scrollTop = chat.scrollHeight;

  try {
    const res = await fetch("https://modelo-discord-server.vercel.app/api/IA", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: pergunta })

    });

    if (!res.ok) {
      throw new Error("Erro na requisição");
    }

    const data = await res.json();
    exibirMensagem("bot", data.resposta);

  } catch (e) {
    console.error(e);
    exibirMensagem("bot", "Erro ao consultar a API.");
  } finally {
    // 3. Ocultar a mensagem de "Pensando..." no final, independentemente do resultado
    loadingMessage.classList.add("hidden");
    // Rola para o final novamente para mostrar a última mensagem
    chat.scrollTop = chat.scrollHeight;
  }
}

// arquivo mecanica.js

function exibirMensagem(remetente, texto) {
  const chat = document.getElementById("chat-container");
  const msg = document.createElement("div");

  msg.className = remetente === "user"
    ? "bg-blue-600 text-white px-3 py-2 rounded-lg self-end max-w-3xl ml-auto"
    : "bg-gray-700 text-white px-3 py-2 rounded-lg self-start max-w-3xl";

  if (remetente === "bot") {
    // Cria um container para o nome e a resposta
    const content = document.createElement("div");

    // Cria um span para o nome do assistente e aplica um estilo de negrito
    const nomeAssistente = document.createElement("span");
    nomeAssistente.textContent = "Skynet: ";
    nomeAssistente.style.fontWeight = "bold";

    // Adiciona o nome do assistente ao container
    content.appendChild(nomeAssistente);

    // Usa marked.js para converter Markdown em HTML
    const respostaFormatada = document.createElement("span");
    respostaFormatada.innerHTML = marked.parse(texto);

    // Adiciona a resposta formatada ao container
    content.appendChild(respostaFormatada);

    // Adiciona o container completo ao balão de mensagem
    msg.appendChild(content);

  } else {
    // Para a mensagem do usuário, exiba o texto normal
    msg.textContent = texto;
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function carregarTemplateProtocolo(tipo) {
  const templateArea = document.getElementById("descricao-protocolar");
  const btnErro = document.getElementById("btn-erro-template");
  const btnSugestao = document.getElementById("btn-sugestao-template");

  // Resetar estados visuais
  if (btnErro) btnErro.classList.remove("ring-2", "ring-offset-2", "ring-red-400");
  if (btnSugestao) btnSugestao.classList.remove("ring-2", "ring-offset-2", "ring-green-400");

  let template = "";

  if (tipo === "erro") {
    template = `1- DESCRIÇÃO DETALHADA. (Preenchimento obrigatório):

2 - INFORMAÇÕES PARA TESTE (Preenchimento obrigatório):

  Versão do executável:
  Versão do banco de dados:
  Caminho do backup do cliente:

  2.1 Testes realizados:

  2.2 Testes com versões anteriores. O erro já ocorria?

  2.3 Se o erro não ocorria em versões anteriores,
      informe a versão utilizada para testes.

3 - QUANDO O ERRO COMEÇOU A ACONTECER?
    COMO O CLIENTE CONSEGUIA EFETUAR A OPERAÇÃO ANTES?

4 - SOLUÇÃO PALIATIVA (Se houver, descrever em detalhes):

5 - SUGESTÃO DE SOLUÇÃO:
`;
    if (btnErro) btnErro.classList.add("ring-2", "ring-offset-2", "ring-red-400");
  } else if (tipo === "sugestao") {
    template = `1 - DESCRIÇÃO DETALHADA.(Preenchimento obrigatório):

2 - JUSTIFICATIVA DA SOLICITAÇÃO. INFORMAÇÃO ADICIONAL SOBRE A RELEVÂNCIA PARA O SISTEMA.
(Descreva aqui algum comentário adicional que ajude a explicar a relevância da sugestão):


3 - FREQUÊNCIA E VOLUME DE UTILIZAÇÃO:

4 - SUGESTÃO OU DICA PARA IMPLEMENTAÇÃO:
`;
    if (btnSugestao) btnSugestao.classList.add("ring-2", "ring-offset-2", "ring-green-400");
  }

  templateArea.value = template.trim();
}

function copiarTramite() {
  const texto = document.getElementById('descricao-protocolar').value;
  if (!texto.trim()) return exibirModal(MENSAGEM_4, "", "info");

  // Tenta copiar o texto para a área de transferência do sistema
  navigator.clipboard.writeText(texto)
    .then(() => {
      exibirModal(MENSAGEM_9, "", "sucesso");
    })
    .catch(() => exibirModal(MENSAGEM_6, "", "erro"));
}

function limparTramite() {
  const templateArea = document.getElementById("descricao-protocolar");
  templateArea.value = "";
}

// Chamar a API assim que a página carregar
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await popularModulosSelect();
    const registros = await carregarRegistrosProtocolos();
    const modulos = await carregarModulos();
    montarGraficoModulos(registros, modulos);

    await atualizarContadoresDosCards(registros);
    await renderizarTabela();
    carregarTemaPreferido();
  } catch (err) {
    console.error("Erro ao inicializar a página:", err);
  }
});