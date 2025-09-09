// js/config.js
const API_SERVER = "https://modelo-discord-server.vercel.app";

const intents = {
  greeting: ["olá", "oi", "bom dia", "boa tarde", "e aí"],
  farewell: ["tchau", "até mais", "adeus"],
  security: ["protocolos de segurança", "tratamento seguro", "segurança de dados"],
  billing: ["faturamento", "cobrança", "pagamento", "financeiro"],
  module_future: ["módulo futuramente", "implementações futuras", "novos módulos"]
};

const responses = {
  greeting: "Olá! Como posso te ajudar hoje?",
  farewell: "Até mais! Fico à disposição.",
  security: "Os protocolos de segurança envolvem criptografia, controle de acesso e auditoria.",
  billing: "O módulo de faturamento permite gerar cobranças, notas fiscais e relatórios financeiros.",
  module_future: "Estamos desenvolvendo novos módulos com foco em segurança e integração futura."
};

let useModel = null;
let protocolos = [];
let protocoloEmbeddings = [];
let protocoloModules = [];
let protocoloFieldsToIndex = ["descricao", "contexto", "tipo", "prt", "modulo", "link"];
