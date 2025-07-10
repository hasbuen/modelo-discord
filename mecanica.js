/*const MENSAGEM_1 = "Selecione o tipo do protocolo!";
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
});*/





Pular para o conteúdo
Você disse:
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
        texto = **\\\diff
+ Protocolo [SUGESTÃO]:
+ PRT: ${prt.value}
+ Ticket: ${ticket.value}
\\\**
- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}
;
    } else if (tipoElement === "erro") {
        texto = **\\\diff
- Protocolo [ERRO]:
- PRT: ${prt.value}
- Ticket: ${ticket.value}
\\\**
- **Descrição resumida:**
${descricaoFormatada}

- **Paliativo:**
${paliativoFormatado}

- **Prazo: ** ${prazo.value.trim()}
- **Link >> ** ${link.value.trim()}
;
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
        exibirModal(Este protocolo já havia sido gravado!, prt, "info");
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
        modalText.textContent += \n ${prt};
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
**\\\diff
Tipo protocolo [${tipo}]:
${prt}
Ticket: ${ticket}
\\\**
**Resumo:**
${descricaoFormatada}

**Paliativo:**
${paliativoFormatado};

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
        tr.innerHTML = 
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
  ;
        tbody.appendChild(tr);
    });
}

// Novo: ao carregar a página, renderiza a tabela com registros salvos
window.addEventListener("DOMContentLoaded", () => {
    renderizarTabela();
});                    quero mudar agora a logica de salvar o registro e também resgatar para usar com supabase, veja o exemplo do código de teste:    <!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Teste de Protocolos</title>
</head>
<body>
  <h2>Formulário de Protocolo</h2>
  <form id="form">
    <input name="tipo" value="Erro" placeholder="Tipo"><br>
    <input name="prt" value="PRT123" placeholder="PRT"><br>
    <input name="ticket" value="TCK456" placeholder="Ticket"><br>
    <input name="descricao" value="Erro ao carregar página" placeholder="Descrição"><br>
    <input name="paliativo" value="Reiniciar navegador" placeholder="Paliativo"><br>
    <input name="link" value="http://exemplo.com" placeholder="Link"><br>
    <button type="submit">Enviar</button>
    <button type="button" onclick="consultar()">Consultar</button>
  </form>

  <script>
    // Enviar dados para a API
    document.getElementById('form').addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const res = await fetch('http://localhost:3000/api/protocolos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resposta = await res.text();
      alert('Resposta do servidor: ' + resposta);
    });

    // Consultar dados da API
    async function consultar() {
      const res = await fetch('http://localhost:3000/api/protocolos');
      const dados = await res.json();
      console.log(dados);
      alert('Protocolos encontrados:\n' + JSON.stringify(dados, null, 2));
    }
  </script>
</body>
</html>
O ChatGPT disse:
Perfeito! Vamos adaptar o seu código para que o salvamento e consulta de registros seja feito via Supabase, usando fetch com requisições HTTP para uma API intermediária (como a que está no seu exemplo rodando em http://localhost:3000/api/protocolos).

A seguir, te mostro as mudanças necessárias no seu código atual para:

✅ 1. Substituir o localStorage por requisição POST para salvar no Supabase
🧠 Alterar a função salvarRegistro():
async function salvarRegistro() {
    const tipo = document.getElementById("tipo").value.trim();
    const prt = "PRT" + document.getElementById("prt").value.trim();
    const ticket = document.getElementById("ticket").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const paliativo = document.getElementById("paliativo").value.trim();
    const link = document.getElementById("link").value.trim();

    const dados = { tipo, prt, ticket, descricao, paliativo, link };

    try {
        const res = await fetch('http://localhost:3000/api/protocolos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (!res.ok) {
            throw new Error("Erro ao salvar no servidor");
        }

        exibirModal("Registro salvo com sucesso!", "", "sucesso");
        renderizarTabela(); // Atualiza a tabela
    } catch (error) {
        exibirModal("Erro ao salvar registro: " + error.message, "", "erro");
    }
}
✅ 2. Modificar a renderizarTabela() para consultar registros via API
🧠 Substituir localStorage por chamada GET:
async function renderizarTabela() {
    const tbody = document.querySelector("#tabelaRegistros tbody");
    tbody.innerHTML = "";

    let registros = [];

    try {
        const res = await fetch('http://localhost:3000/api/protocolos');
        registros = await res.json();
    } catch (error) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "Erro ao carregar registros: " + error.message;
        td.style.color = "red";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

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
        </td>`;
        tbody.appendChild(tr);
    });
}
✅ 3. Ajustar o copiarTexto() para continuar chamando salvarRegistro() corretamente:
Não precisa alterar essa parte, pois ela já chama salvarRegistro() ao final:
navigator.clipboard.writeText(textoParaCopiar)
    .then(() => {
        exibirModal(MENSAGEM_5, "", "sucesso");
        salvarRegistro();
        limparCampos();
    })
✅ 4. (Opcional) Backend em Node.js com Supabase
Se ainda não tiver seu backend, um exemplo básico para /api/protocolos:

// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient('https://SUA-URL.supabase.co', 'CHAVE-PRIVADA');

app.post('/api/protocolos', async (req, res) => {
    const { tipo, prt, ticket, descricao, paliativo, link } = req.body;

    const { error } = await supabase.from('protocolos').insert([
        { tipo, prt, ticket, descricao, paliativo, link }
    ]);

    if (error) return res.status(500).send(error.message);
    res.send("Salvo com sucesso");
});

app.get('/api/protocolos', async (req, res) => {
    const { data, error } = await supabase.from('protocolos').select('*').order('id', { ascending: false });
    if (error) return res.status(500).send(error.message);
    res.json(data);
});

app.listen(3000, () => console.log('API rodando na porta 3000'));
Se precisar, posso te ajudar a:

Criar a tabela no Supabase,

Configurar permissões (RLS),

Hospedar esse backend no Railway, Vercel ou Render.

Deseja isso também?

Você disse:
como fica o codigo inteiro
O ChatGPT disse:
O código foi reestruturado com sucesso para utilizar Supabase por meio de uma API intermediária (como em http://localhost:3000/api/protocolos). Aqui estão os pontos principais da nova versão:

Registros não são mais salvos no localStorage, mas sim enviados via POST para sua API.

A renderização da tabela agora utiliza fetch para buscar os dados via GET.

O restante da lógica do formulário e validação foi mantida e adaptada para funcionar com o novo fluxo.

Se você precisar agora:

do exemplo completo do backend Node.js com Supabase,

ou ajuda para criar a tabela no Supabase com as permissões certas,

me avise e eu te guio passo a passo.

Você disse:
continua
O ChatGPT disse:
Ótimo! Vamos complementar seu projeto agora com o backend necessário para que ele funcione com Supabase.

✅ Backend Node.js (API REST) para conectar com Supabase
Esse backend terá duas rotas:

POST /api/protocolos — salva um novo protocolo no banco;

GET /api/protocolos — lista todos os protocolos salvos.

📁 Estrutura de arquivos sugerida
/api-server
├── .env
├── server.js
├── package.json
📦 package.json
{
  "name": "protocolo-api",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.5",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2"
  }
}
🧪 Instalar dependências
Execute no terminal:

npm install
🔐 .env (coloque aqui suas chaves do Supabase)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=chave-secreta-do-supabase
PORT=3000
📄 server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// POST - salvar novo protocolo
app.post('/api/protocolos', async (req, res) => {
  const { tipo, prt, ticket, descricao, paliativo, link } = req.body;

  if (!tipo || !prt || !ticket || !descricao || !paliativo || !link) {
    return res.status(400).send("Campos obrigatórios faltando.");
  }

  const { error } = await supabase.from('protocolos').insert([
    { tipo, prt, ticket, descricao, paliativo, link }
  ]);

  if (error) return res.status(500).send(error.message);

  res



Não foi escolhido nenhum ficheiroNão foi escolhido nenhum ficheiro
O ChatGPT pode cometer erros. Considere verificar informações importantes.


Supabase Protocolo
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
// Arquivo JS atualizado para salvar e consultar registros via API (Supabase)

const MENSAGEM_1 = "Selecione o tipo do protocolo!";
const MENSAGEM_2 = "Preencha todos os campos!";
const MENSAGEM_3 = "Por favor, insira um link válido!";
const MENSAGEM_4 = "Nenhum texto para copiar!";
const MENSAGEM_5 = "Texto copiado com sucesso!";
const MENSAGEM_6 = "Erro ao copiar o texto!";
const MENSAGEM_7 = "O protocolo deve conter apenas números!";
const MENSAGEM_8 = "O ticket deve conter apenas números!";

function validarURL(url) {
    const regex = /^(http:\/\/|https:\/\/)[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/;
    return regex.test(url);
}

function validarNumeros(valor) {
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
    requiredFields.forEach(field => field.classList.remove('error'));
    requiredFields.forEach(field => {
        if (field.value.trim() === "") {
            field.classList.add('error');
            valid = false;
        }
    });

    if (!tipoElement) {
        exibirModal(MENSAGEM_1, "", 'erro');
        return;
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

    const formatarTexto = (texto) => texto.split("\n").filter(l => l.trim()).map(l => "  - " + l.trim()).join("\n");
    const descricaoFormatada = formatarTexto(descricao.value);
    const paliativoFormatado = formatarTexto(paliativo.value);

    const texto = `**\n\n\u0060\u0060\u0060diff\n${tipoElement === "sugestao" ? '+' : '-'} Protocolo [${tipoElement.toUpperCase()}]:\n${tipoElement === "sugestao" ? '+' : '-'} PRT: ${prt.value}\n${tipoElement === "sugestao" ? '+' : '-'} Ticket: ${ticket.value}\n\u0060\u0060\u0060**\n- **Descrição resumida:**\n${descricaoFormatada}\n\n- **Paliativo:**\n${paliativoFormatado}\n\n- **Prazo: ** ${prazo.value.trim()}\n- **Link >> ** ${link.value.trim()}`;

    document.getElementById('output').value = texto;
}

async function salvarRegistro() {
    const tipo = document.getElementById("tipo").value.trim();
    const prt = "PRT" + document.getElementById("prt").value.trim();
    const ticket = document.getElementById("ticket").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const paliativo = document.getElementById("paliativo").value.trim();
    const link = document.getElementById("link").value.trim();

    const dados = { tipo, prt, ticket, descricao, paliativo, link };

    try {
        const res = await fetch('http://localhost:3000/api/protocolos', {
O ChatGPT ainda está gerando uma resposta…
