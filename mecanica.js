const MENSAGEM_1 = "Selecione o tipo do protocolo!";
const MENSAGEM_2 = "Preencha todos os campos!";
const MENSAGEM_3 = "Por favor, insira um link válido!";
const MENSAGEM_4 = "Nenhum texto para copiar!";
const MENSAGEM_5 = "Texto copiado com sucesso!";
const MENSAGEM_6 = "Erro ao copiar o texto!";
const MENSAGEM_7 = "O protocolo deve conter apenas números!";
const MENSAGEM_8 = "O ticket deve conter apenas números!";

function validarURL(url) {
    console.log(url); // Adicione este log para ver o valor da URL
    const regex = /^(http:\/\/|https:\/\/)[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/;
    return regex.test(url);
}

function validarNumeros(valor) {
    // Aceita apenas números (de 1 ou mais dígitos)
    const regex = /^\d+$/;
    return regex.test(valor);
}

function gerarTexto() {
    const tipoElement = document.getElementById('tipo').value.trim();
    const prt = document.getElementById('prt');
    const ticket = document.getElementById('ticket');
    const descricao = document.getElementById('descricao');
    const paliativo = document.getElementById('paliativo');
    const prazo = document.getElementById('prazo');
    const link = document.getElementById('link');
    const requiredFields = [prt, ticket, descricao, paliativo, prazo, link];

    let valid = true;

    requiredFields.forEach(field => {
        field.classList.remove('error');
    });

    requiredFields.forEach(field => {
        if (field.value.trim() === "") {
            field.classList.add('error');
            valid = false;
        }
    });

    if (!tipoElement) {
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

    if (tipoElement === "sugestao") {
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
    } else if (tipoElement === "erro") {
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

// salva os dados no localStorage
function salvarRegistro() {
    const tipo = document.getElementById("tipo").value.trim();
    const prt = "#PRT"+document.getElementById("prt").value.trim();
    const ticket = "#"+document.getElementById("ticket").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const paliativo = document.getElementById("paliativo").value.trim();
    const link = document.getElementById("link").value.trim();
    let registrosJaGravados = JSON.parse(localStorage.getItem("registros") || "[]");

    // Verifica se já existe um registro com o mesmo PRT
    const prtExistente = registrosJaGravados.some(reg => reg.prt === prt);
    if (prtExistente) {
        exibirModal(`Este protocolo já havia sido gravado!`, prt, "info");
        return;
    }

    const registro = { tipo, prt, ticket, descricao, paliativo, link };

    let registros = JSON.parse(localStorage.getItem("registros") || "[]");
    registros.push(registro);
    localStorage.setItem("registros", JSON.stringify(registros));

    renderizarTabela();
}

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
        // Adiciona o PRT ao texto do modal, se fornecido
        modalText.textContent += `\n ${prt}`;
    }
    modal.style.display = "inline-block";
    modalText.style.whiteSpace = "pre-wrap"; // Permite quebras de linha
}


function fecharModal() {
    const modal = document.getElementById("errorModal");
    modal.style.display = "none";
}

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

function copiarLinha(botao) {
    const linha = botao.closest("tr");
    const colunas = linha.querySelectorAll("td");

    const ticket = colunas[0]?.innerText.trim();
    const prt = colunas[1]?.innerText.trim();
    const tipo = colunas[2]?.innerText.trim().toUpperCase();
    const descricao = colunas[3]?.innerText.trim();
    const paliativo = colunas[4]?.innerText.trim();

    const descricaoFormatada = descricao.replace(/\n/g, ' ');
    const paliativoFormatado = paliativo.replace(/\n/g, ' ');

    const texto =
`**\`\`\`diff
Tipo protocolo [${tipo}]:
${prt}
Ticket: ${ticket}
\`\`\`**
**Resumo:**
${descricaoFormatada}

**Paliativo:**
${paliativoFormatado}`;

    navigator.clipboard.writeText(texto)
        .then(() => exibirModal("Texto formatado copiado para colar no Discord!", "", "sucesso"))
        .catch(() => exibirModal("Erro ao copiar o texto.", "", "erro"));
}

function mostrarTabela() {
    const tabela = document.getElementById("tabela-container");
    const icone = document.getElementById("icon-toggle");
    const texto = document.getElementById("texto-toggle");

    // Alterna a visibilidade
    tabela.classList.toggle("hidden");

    if (tabela.classList.contains("hidden")) {
        icone.className = "fas fa-chevron-down icon";
        texto.textContent = "Exibir seu histórico de protocolos já registrados";
    } else {
        icone.className = "fas fa-chevron-up icon";
        texto.textContent = "Ocultar seu histórico de protocolos já registrados";
    }
}

// renderiza a tabela no footer
function renderizarTabela() {
    const tbody = document.querySelector("#tabelaRegistros tbody");
    tbody.innerHTML = "";

    const registros = JSON.parse(localStorage.getItem("registros") || "[]");

    if (registros.length === 0) {
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
        tr.innerHTML = `
        <td><a href="${reg.link}" target="_blank">${reg.ticket}</a></td>
        <td>${reg.prt}</td>
        <td>
            ${reg.tipo.toLowerCase() === "sugestao"
                ? '<span style="background-color: green; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Sugestão</span>'
                : '<span style="background-color: red; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Erro</span>'
            }
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

        <td>${reg.paliativo}</td>
        <td>
            <button onclick="copiarLinha(this)" title="Copiar"><i class="fas fa-copy"></i></button>
        </td>
  `;
        tbody.appendChild(tr);
    });
}

// Novo: ao carregar a página, renderiza a tabela com registros salvos
window.addEventListener("DOMContentLoaded", () => {
    renderizarTabela();
});
