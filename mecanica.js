// Mensagens reutilizáveis no sistema
const MENSAGEM_1 = "Selecione o tipo do protocolo!";
const MENSAGEM_2 = "Preencha todos os campos!";
const MENSAGEM_3 = "Por favor, insira um link válido!";
const MENSAGEM_4 = "Nenhum texto para copiar!";
const MENSAGEM_5 = "Texto copiado com sucesso!";
const MENSAGEM_6 = "Erro ao copiar o texto!";
const MENSAGEM_7 = "O protocolo deve conter apenas números!";
const MENSAGEM_8 = "O ticket deve conter apenas números!";

// Cache local de registros, evita chamadas repetidas à API
let registrosCache = [];

// Função para carregar registros da API e cacheá-los
async function carregarRegistrosProtocolos() {
    if (registrosCache.length > 0) return registrosCache; // usa cache se já carregado

    try {
        const res = await fetch("https://modelo-discord-server.vercel.app/api/protocolos");
        const data = await res.json();

        // Ordena os registros por 'id' em ordem decrescente
        data.sort((a, b) => b.id - a.id);

        registrosCache = data;
        return registrosCache;
    } catch (err) {
        console.error("Erro ao carregar registros da API:", err);
        return [];
    }
}

// Valida se uma string é uma URL válida (http/https)
function validarURL(url) {
    const regex = /^(http:\/\/|https:\/\/)[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/;
    return regex.test(url);
}

// Valida se o valor contém apenas dígitos numéricos
function validarNumeros(valor) {
    const regex = /^\d+$/;
    return regex.test(valor);
}

// Gera texto formatado com base nos campos preenchidos do formulário
function gerarTexto() {
    const tipoElement = document.getElementById('tipo').value.trim();
    const tipo = tipoElement === "erro" ? '0' : '1';
    const prt = document.getElementById('prt');
    const ticket = document.getElementById('ticket');
    const descricao = document.getElementById('descricao');
    const paliativo = document.getElementById('paliativo');
    const prazo = document.getElementById('prazo');
    const link = document.getElementById('link');
    const requiredFields = [prt, ticket, descricao, paliativo, prazo, link];

    let valid = true;
    requiredFields.forEach(field => field.classList.remove('error'));
    requiredFields.forEach(field => {
        if (field.value.trim() === "") {
            field.classList.add('error');
            valid = false;
        }
    });

    // Validações em cascata para cada campo
    if (!tipo) {
        valid = false;
        exibirModal(MENSAGEM_1, "", 'erro');
    } else if (!valid) {
        exibirModal(MENSAGEM_2, "", 'erro');
        return;
    } else if (!validarURL(link.value)) {
        exibirModal(MENSAGEM_3, "", 'erro');
        return;
    } else if (!validarNumeros(prt.value.trim())) {
        exibirModal(MENSAGEM_7, "", 'erro');
        return;
    } else if (!validarNumeros(ticket.value.trim())) {
        exibirModal(MENSAGEM_8, "", 'erro');
        return;
    }

    let texto = "";

    // Função auxiliar para formatar parágrafos com hífen
    const formatarTexto = (texto) => {
        let linhas = texto.split("\n");
        let resultado = [];

        for (let linha of linhas) {
            let linhaTrimmed = linha.trim();
            if (linhaTrimmed) {
                resultado.push("  - " + linhaTrimmed);
            }
        }
        return resultado.join("\n");
    };

    const descricaoFormatada = formatarTexto(descricao.value);
    const paliativoFormatado = formatarTexto(paliativo.value);

    // Gera texto diferenciado por tipo de protocolo
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
    } else if (tipo === '0') {
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
    } else {
        exibirModal(MENSAGEM_1, "", 'erro');
        return;
    }

    document.getElementById('output').value = texto;
}

// Função para salvar um novo registro na API
async function salvarRegistro() {
    //const tipo = document.getElementById("tipo").value.trim();
    const tipoProtocolo = document.getElementById("tipo").value.trim();
    const tipo = tipoProtocolo === "erro" ? 0 : 1;

    const prt = "#PRT" + document.getElementById("prt").value.trim();
    const ticket = "#" + document.getElementById("ticket").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const paliativo = document.getElementById("paliativo").value.trim();
    const link = document.getElementById("link").value.trim();

    const pegaRegistrosArmazenados = await carregarRegistrosProtocolos();

    // Verifica se o protocolo já existe
    const prtExistente = pegaRegistrosArmazenados.some(reg => reg.prt === prt);
    if (prtExistente) {
        exibirModal(`Este protocolo já havia sido gravado!`, prt, "info");
        return;
    }

    const registro = { tipo, prt, ticket, descricao, paliativo, link };
    try {
        const res = await fetch('https://modelo-discord-server.vercel.app/api/protocolos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registro)
        });

        if (!res.ok) throw new Error("Erro ao salvar no servidor");

        exibirModal("Registro salvo com sucesso!", "", "sucesso");
        renderizarTabela();
    } catch (error) {
        exibirModal("Erro ao salvar registro: " + error.message, "", "erro");
    }
}

// Função para copiar o texto formatado
function copiarTexto() {
    const outputElement = document.getElementById('output');
    const textoParaCopiar = outputElement.value;

    if (textoParaCopiar.trim() === "") {
        exibirModal(MENSAGEM_4, "", "info");
        return;
    }

    navigator.clipboard.writeText(textoParaCopiar)
        .then(() => {
            exibirModal(MENSAGEM_5, "", "sucesso");
            salvarRegistro();
            limparCampos();
        })
        .catch(() => {
            exibirModal(MENSAGEM_6, "", "erro");
        });
}

// Exibe modal com mensagem e ícone personalizado
function exibirModal(mensagem, prt, tipo = "info") {
    const modal = document.getElementById("errorModal");
    const modalIcon = document.getElementById("modalIcon");
    const modalText = document.getElementById("modalText");

    // Ícones por tipo
    let iconHTML = '';
    switch (tipo) {
        case "erro":
            iconHTML = '<i class="fas fa-exclamation-triangle" style="color: #ff4c4c;"></i>';
            break;
        case "sucesso":
            iconHTML = '<i class="fas fa-check-circle" style="color: #4caf50;"></i>';
            break;
        case "info":
        default:
            iconHTML = '<i class="fas fa-info-circle" style="color: #2196f3;"></i>';
            break;
    }

    modalIcon.innerHTML = iconHTML;
    modalText.textContent = mensagem;
    if (prt.trim() !== "" && prt !== null) {
        modalText.textContent += `\n ${prt}`;
    }
    modal.style.display = "inline-block";
    modalText.style.whiteSpace = "pre-wrap";
}

// Fecha o modal de erro/sucesso/info
function fecharModal() {
    const modal = document.getElementById("errorModal");
    modal.style.display = "none";
}

// Limpa os campos do formulário após submissão
function limparCampos() {
    document.getElementById('prt').value = '';
    document.getElementById('ticket').value = '';
    document.getElementById('descricao').value = '';
    document.getElementById('paliativo').value = '';
    document.getElementById('prazo').value = '';
    document.getElementById('link').value = '';
    document.getElementById('output').value = '';
    const radioButtons = document.querySelectorAll('input[name="tipo"]');
    radioButtons.forEach(radio => {
        radio.checked = false;
    });
}

// Função de busca na tabela de registros
function filtrarTabela() {
    const input = document.getElementById("busca");
    const filter = input.value.toLowerCase();
    const tabela = document.getElementById("tabelaRegistros");
    const trs = tabela.getElementsByTagName("tr");

    for (let i = 1; i < trs.length; i++) {
        const tds = trs[i].getElementsByTagName("td");
        let found = false;

        for (let j = 0; j < tds.length; j++) {
            if (tds[j].textContent.toLowerCase().includes(filter)) {
                found = true;
                break;
            }
        }

        trs[i].style.display = found ? "" : "none";
    }
}

function ordenarTabela(coluna) {
  const tabela = document.querySelector("table");
  const linhas = Array.from(tabela.querySelectorAll("tbody tr"));
  const icone = document.querySelector(`th[onclick*="${coluna}"] .icone-seta`);

  let ordemAsc = !icone.classList.contains("asc");

  linhas.sort((a, b) => {
    const valorA = a.querySelector(`td[data-coluna="${coluna}"]`).textContent.trim();
    const valorB = b.querySelector(`td[data-coluna="${coluna}"]`).textContent.trim();
    return ordemAsc ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
  });

  linhas.forEach(linha => tabela.querySelector("tbody").appendChild(linha));

  document.querySelectorAll(".icone-seta").forEach(i => i.classList.remove("ativo", "asc", "desc"));
  icone.classList.add("ativo", ordemAsc ? "asc" : "desc");
}

// Função que copia o conteúdo formatado de uma linha da tabela para a área de transferência
function copiarLinha(botao, paliativoOriginal) {
    const linha = botao.closest("tr"); // Pega a linha da tabela onde o botão foi clicado
    const colunas = linha.querySelectorAll("td"); // Pega todas as colunas da linha

    // Extrai dados das colunas
    const ticket = colunas[0]?.innerText.trim();
    const prt = colunas[1]?.innerText.trim();
    const tipo = colunas[2]?.innerText.trim().toUpperCase();
    const descricao = colunas[3]?.innerText.trim();
    const paliativo = colunas[4]?.innerText.trim();

    // Remove quebras de linha para o Discord
    const descricaoFormatada = descricao.replace(/\n/g, ' ');
    const paliativoFormatado = paliativoOriginal.replace(/\n/g, ' ');

    let texto = "";

    // Monta o texto formatado de acordo com o tipo
    if (tipo === 0) {
        texto = `**\`\`\`diff
- Tipo protocolo [${tipo}]:
- ${prt}
- Ticket: ${ticket}
\`\`\`**
**Resumo:**
${descricaoFormatada}

**Paliativo:**
${paliativoFormatado}`;
    } else {
        texto = `**\`\`\`diff
+ Tipo protocolo [${tipo}]:
+ ${prt}
+ Ticket: ${ticket}
\`\`\`**
**Resumo:**
${descricaoFormatada}

**Paliativo:**
${paliativoFormatado}`;
    }

    // Copia o texto para a área de transferência
    navigator.clipboard.writeText(texto)
        .then(() => exibirModal("Texto formatado copiado para colar no Discord!", "", "sucesso"))
        .catch(() => exibirModal("Erro ao copiar o texto.", "", "erro"));
}

// Alterna a visibilidade da tabela de registros (mostrar/ocultar)
function mostrarTabela() {
    const tabela = document.getElementById("tabela-container");
    const icone = document.getElementById("icon-toggle");
    const texto = document.getElementById("texto-toggle");

    tabela.classList.toggle("hidden"); // Mostra ou esconde a tabela

    // Atualiza o ícone e o texto do botão
    if (tabela.classList.contains("hidden")) {
        icone.className = "fas fa-chevron-down icon";
        texto.textContent = "Exibir histórico!";
    } else {
        icone.className = "fas fa-chevron-up icon";
        texto.textContent = "Ocultar histórico!";
    }
}


// Renderiza os registros em uma tabela HTML
async function renderizarTabela() {
    const tbody = document.querySelector("#tabelaRegistros tbody");
    tbody.innerHTML = ""; // Limpa a tabela

    registrosCache = []; // Zera cache para forçar recarregamento da API

    const registros = await carregarRegistrosProtocolos();
    atualizarContadoresDosCards(); // Atualiza os contadores visuais

    if (registros.length === 0) {
        // Exibe mensagem de tabela vazia
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.style.textAlign = "center";
        td.style.padding = "20px";
        td.style.color = "#666";
        td.style.fontSize = "1.2rem";
        td.style.fontStyle = "italic";
        td.textContent = "No momento nenhum registro gravado.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    registros.forEach(reg => {
        const tr = document.createElement("tr");
        
        // Preenche colunas da linha
        tr.innerHTML = `
            <td><a href="${reg.link}" target="_blank">${reg.ticket}</a></td>
            <td>${reg.prt}</td>
            <td>
                ${reg.tipo === '1'
                ? '<span style="background-color: green; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Sugestão</span>'
                : '<span style="background-color: red; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Erro</span>'}
            </td>
            <td>
                <div class="tooltip-container">
                    <span class="descricao-resumida">
                        ${reg.descricao.length > 200 ? reg.descricao.slice(0, 300) + ' ...' : reg.descricao}
                    </span>
                    <div class="tooltip-text">
                        ${reg.descricao.replace(/\n/g, "<br>").replace(/"/g, '&quot;')}
                    </div>
                </div>
            </td>
        `;

        // Cria coluna com botões de ação
        const tdAcoes = document.createElement("td");
        tdAcoes.classList.add("td-acoes");

        const btnVer = document.createElement("button");
        btnVer.textContent = "Ver";
        btnVer.classList.add("btn-paliativo");
        btnVer.onclick = () => {
            mostrarModalPaliativo(reg.paliativo);
        };

        const btnCopiar = document.createElement("button");
        btnCopiar.classList.add("btn-copiar");
        btnCopiar.innerHTML = '<i class="fas fa-copy"></i>';
        btnCopiar.onclick = () => {
            copiarLinha(btnCopiar, reg.paliativo);
        };

        const btnExcluir = document.createElement("button");
        btnExcluir.classList.add("btn-excluir");
        btnExcluir.innerHTML = '<i class="fas fa-trash-alt"></i>';
        btnExcluir.onclick = () => {
            abrirModalExclusao(reg.id, reg.ticket); // chama modal com id e protocolo
        };

        tdAcoes.appendChild(btnVer);
        tdAcoes.appendChild(btnCopiar);
        tdAcoes.appendChild(btnExcluir);
        tr.appendChild(tdAcoes);

        tbody.appendChild(tr);
    });
}

// Exibe modal com mensagem
function exibirModal(mensagem, tipo = "info") {
    const modal = document.getElementById("errorModal");
    const modalIcon = document.getElementById("modalIcon");
    const modalText = document.getElementById("modalText");

    const icons = {
        info: '<i class="fas fa-info-circle"></i>',
        error: '<i class="fas fa-exclamation-triangle"></i>',
        success: '<i class="fas fa-check-circle"></i>'
    };

    modalIcon.innerHTML = icons[tipo] || '';
    modalText.innerText = mensagem;
    modal.style.display = "block";
}

// Fecha o modal de mensagens
function fecharModal() {
    document.getElementById("errorModal").style.display = "none";
}

// Exibe modal com o texto completo do paliativo
function mostrarModalPaliativo(texto) {
    const modal = document.getElementById("paliativoModal");
    const content = document.getElementById("paliativoModalText");
    content.textContent = texto || "Nenhuma informação disponível.";
    modal.style.display = "block";
}

// Fecha o modal de paliativo
function fecharPaliativoModal() {
    const modal = document.getElementById("paliativoModal");
    modal.style.display = "none";
}

// Copia o conteúdo do texto paliativo para a área de transferência
function copiarTextoPaliativo() {
    const texto = document.getElementById("paliativoModalText").textContent;
    navigator.clipboard.writeText(texto)
        .then(() => exibirModal("Texto do paliativo copiado com sucesso!", "", "sucesso"))
        .catch(() => exibirModal("Erro ao copiar texto do paliativo.", "", "erro"));
}

// Atualiza os contadores de erros e sugestões visíveis nos cards
async function atualizarContadoresDosCards() {
    const registros = await carregarRegistrosProtocolos();

    //const totalErros = registros.filter(r => r.tipo?.trim()?.toLowerCase() === "erro").length;
    //const totalSugestoes = registros.filter(r => r.tipo?.trim()?.toLowerCase() === "sugestao").length;
    const totalErros = registros.filter(r => r.tipo === '0').length;
    const totalSugestoes = registros.filter(r => r.tipo === '1').length;

    const erroEl = document.getElementById("contador-erros");
    const sugestaoEl = document.getElementById("contador-sugestoes");

    // Aplica delay para simular carregamento
    setTimeout(() => {
        erroEl.classList.remove("skeleton-loader");
        sugestaoEl.classList.remove("skeleton-loader");

        erroEl.textContent = totalErros;
        sugestaoEl.textContent = totalSugestoes;
    }, 2000); // 2 segundos
}

let idParaExcluir = null;
let protocoloEsperado = null;

function abrirModalExclusao(id, ticket) {
    idParaExcluir = id;
    protocoloEsperado = ticket;
    document.getElementById("ticketEsperado").textContent = ticket;
    document.getElementById("inputConfirmacao").value = "";
    document.getElementById("btnConfirmar").disabled = true;
    document.getElementById("modalExclusao").style.display = "block";
}

function verificarConfirmacao() {
    const valor = document.getElementById("inputConfirmacao").value.trim();
    document.getElementById("btnConfirmar").disabled = valor !== protocoloEsperado;
}

function confirmarExclusao() {
    fetch("https://modelo-discord-server.vercel.app/api/protocolos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idParaExcluir })
    })
        .then(res => res.text())
        .then(msg => {
            fecharModalEclusao();
            renderizarTabela(); // atualiza a tabela após exclusão
        })
        .catch(err => {
            alert("Erro ao excluir.");
            fecharModalEclusao();
        });
}

function fecharModalEclusao() {
    document.getElementById("modalExclusao").style.display = "none";
}

// Torna o modal de paliativo arrastável com o mouse
(function tornarPaliativoModalArrastavel() {
    const modal = document.getElementById("paliativoModalContent");
    const header = document.getElementById("paliativoModalHeader");

    let isDragging = false, offsetX = 0, offsetY = 0;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        const rect = modal.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            modal.style.left = `${e.clientX - offsetX}px`;
            modal.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.userSelect = "auto";
    });
})();

// Executa ao carregar a página
window.addEventListener("DOMContentLoaded", async () => {
    await atualizarContadoresDosCards();
    await renderizarTabela();
});
