import {
  MENSAGEM_1, MENSAGEM_2, MENSAGEM_3,
  MENSAGEM_4, MENSAGEM_5, MENSAGEM_6,
  MENSAGEM_7, MENSAGEM_8
} from "./mensagens.js";

import { validarURL, validarNumeros } from "./utils.js";
import { exibirModal } from "./modal.js";
import { carregarRegistrosProtocolos } from "./api.js";
import { renderizarTabela } from "./tabela.js";

export function gerarTexto() {
  const tipoElement = document.getElementById('tipo').value.trim();
  const tipo = tipoElement === "erro" ? '0' : '1';

  const prt = document.getElementById('prt');
  const ticket = document.getElementById('ticket');
  const descricao = document.getElementById('descricao');
  const paliativo = document.getElementById('paliativo');
  const prazo = document.getElementById('prazo');
  const link = document.getElementById('link');
  const campos = [prt, ticket, descricao, paliativo, prazo, link];

  if (!tipoElement) return exibirModal(MENSAGEM_1, "", "erro");
  if (campos.some(f => !f.value.trim())) return exibirModal(MENSAGEM_2, "", "erro");
  if (!validarURL(link.value)) return exibirModal(MENSAGEM_3, "", "erro");
  if (!validarNumeros(prt.value.trim())) return exibirModal(MENSAGEM_7, "", "erro");
  if (!validarNumeros(ticket.value.trim())) return exibirModal(MENSAGEM_8, "", "erro");

  const formatar = txt => txt.split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => "  - " + l)
    .join("\n");

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

export async function salvarRegistro() {
  const tipo = document.getElementById("tipo").value;
  const prt = "#PRT" + document.getElementById("prt").value.trim();
  const ticket = "#" + document.getElementById("ticket").value.trim();
  const descricao = document.getElementById("descricao").value.trim();
  const paliativo = document.getElementById("paliativo").value.trim();
  const link = document.getElementById("link").value.trim();

  const registros = await carregarRegistrosProtocolos();
  if (registros.some(r => r.prt === prt)) return exibirModal("Já gravado!", prt, "info");

  const registro = { tipo: tipo === "erro" ? 0 : 1, prt, ticket, descricao, paliativo, link };

  try {
    await fetch('https://modelo-discord-server.vercel.app/api/protocolos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registro)
    });
    exibirModal("Registro salvo com sucesso!", "", "sucesso");
    await renderizarTabela();
  } catch {
    exibirModal("Erro ao salvar registro.", "", "erro");
  }
}

export function copiarTexto() {
  const texto = document.getElementById('output').value;
  if (!texto.trim()) return exibirModal(MENSAGEM_4, "", "info");
  navigator.clipboard.writeText(texto)
    .then(() => {
      exibirModal(MENSAGEM_5, "", "sucesso");
      salvarRegistro();
      limparCampos();
    })
    .catch(() => exibirModal(MENSAGEM_6, "", "erro"));
}

export function limparCampos() {
  ["prt", "ticket", "descricao", "paliativo", "prazo", "link", "output"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("btn-erro").classList.remove("ring-2", "ring-offset-2", "ring-red-400");
  document.getElementById("btn-sugestao").classList.remove("ring-2", "ring-offset-2", "ring-green-400");
  document.getElementById("tipo").value = '';
}
