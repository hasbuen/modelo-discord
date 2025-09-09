import { gerarTexto, salvarRegistro, copiarTexto, limparCampos } from "./formulario.js";
import { filtrarTabela, ordenarTabela, renderizarTabela } from "./tabela.js";
import { enviarPergunta } from "./chat.js";
import { carregarTemaPreferido, alternarTema } from "./tema.js";

import "./mensagens.js";
import "./utils.js";
import "./modal.js";

window.addEventListener("DOMContentLoaded", async () => {
  carregarTemaPreferido();
  await renderizarTabela();
  atualizarContadoresDosCards();

  document.getElementById("btn-gerar").onclick = gerarTexto;
  document.getElementById("btn-salvar").onclick = salvarRegistro;
  document.getElementById("btn-copiar").onclick = copiarTexto;
  document.getElementById("btn-limpar").onclick = limparCampos;

  document.getElementById("busca").oninput = filtrarTabela;
  document.querySelectorAll("#tabelaRegistros th").forEach((th, i) => {
    th.onclick = () => ordenarTabela(i);
  });

  document.getElementById("btn-enviar").onclick = enviarPergunta;
  document.getElementById("chat-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarPergunta();
  });

  document.getElementById("tema-claro").onclick = () => alternarTema("claro");
  document.getElementById("tema-escuro").onclick = () => alternarTema("escuro");
  document.getElementById("tema-sistema").onclick = () => alternarTema("system");
});
