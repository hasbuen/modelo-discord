import { gerarTexto, salvarRegistro, copiarTexto, limparCampos } from "./formulario.js";
import { filtrarTabela, ordenarTabela, renderizarTabela } from "./tabela.js";
import { enviarPergunta } from "./chat.js";
import { carregarTemaPreferido, alternarTema } from "./tema.js";

// Inicialização da página
window.addEventListener("DOMContentLoaded", async () => {
  carregarTemaPreferido();
  await renderizarTabela();

  // Liga os botões do formulário
  document.getElementById("btn-gerar").onclick = gerarTexto;
  document.getElementById("btn-salvar").onclick = salvarRegistro;
  document.getElementById("btn-copiar").onclick = copiarTexto;
  document.getElementById("btn-limpar").onclick = limparCampos;

  // Busca e ordenação da tabela
  document.getElementById("busca").oninput = filtrarTabela;
  document.querySelectorAll("#tabelaRegistros th").forEach((th, i) => {
    th.onclick = () => ordenarTabela(i);
  });

  // Chat
  document.getElementById("btn-enviar").onclick = enviarPergunta;
  document.getElementById("chat-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarPergunta();
  });

  // Tema
  document.getElementById("tema-claro").onclick = () => alternarTema("claro");
  document.getElementById("tema-escuro").onclick = () => alternarTema("escuro");
  document.getElementById("tema-sistema").onclick = () => alternarTema("system");
});
