# Documentação Técnica Da Interface ProtoCord

## Resumo

Este documento descreve a interface web do ProtoCord, sua organização interna, os principais módulos JavaScript, as variáveis de configuração e o relacionamento com o servidor. A finalidade é apoiar manutenção, implantação e evolução do projeto.

## Sumário

1. Escopo  
2. Organização do projeto  
3. Módulos principais  
4. Fluxo de dados  
5. Variáveis de configuração  
6. Persistência local  
7. Contratos de comunicação  
8. Testes  
9. Recomendações de manutenção

## 1. Escopo

A interface é responsável pela experiência operacional do usuário. Ela apresenta formulários, tabelas, painéis, gráficos, modais, assistente e ferramentas auxiliares. A aplicação não deve conter segredos, chaves de acesso ou credenciais de integrações externas.

## 2. Organização Do Projeto

| Caminho | Descrição |
| --- | --- |
| `index.html` | Documento principal da aplicação. |
| `style.css` | Estilos globais e componentes visuais. |
| `html/comparador-textos.html` | Ferramenta auxiliar para comparação textual. |
| `js/` | Módulos JavaScript da aplicação. |
| `tests/` | Testes automatizados executados com Node.js. |

## 3. Módulos Principais

| Arquivo | Responsabilidade |
| --- | --- |
| `js/runtime-config.js` | Resolve a URL base da API e expõe funções globais de configuração. |
| `js/auth.js` | Controla autenticação, sessão local e encerramento de sessão. |
| `js/mecanica.js` | Implementa o fluxo principal de cadastro, listagem, cópia e exclusão de protocolos. |
| `js/protocolos.js` | Mantém índice visual de protocolos e modais de detalhe. |
| `js/dashboard-liberacoes.js` | Renderiza histórico e indicadores de liberações. |
| `js/verificacao_release.js` | Processa arquivos RTF para validação de PRTs por versão. |
| `js/ia-transcriber.js` | Controla gravação, envio, transcrição e formatação de atendimentos em áudio. |
| `js/ia-assistant.js` e `js/ia-assistant-embedded.js` | Implementam a experiência do assistente contextual. |
| `js/kpi-modern.js` | Renderiza indicadores, cartões, gráficos e percepções operacionais. |
| `js/monitor_sefaz.js` | Apresenta monitor visual de serviços por unidade federativa. |
| `js/reports.js` e `js/metas.js` | Apoiam relatórios e acompanhamentos complementares. |

## 4. Fluxo De Dados

1. O arquivo `index.html` carrega dependências e scripts.
2. O arquivo `js/runtime-config.js` define `window.PROTOCORD_API_BASE_URL`.
3. Cada módulo monta as rotas por meio de `window.getProtocordApiUrl(path)`.
4. O servidor retorna dados em formato JSON.
5. A interface converte os dados em tabelas, cartões, gráficos, modais e mensagens adequadas ao usuário final.

## 5. Variáveis De Configuração

| Nome | Tipo | Finalidade |
| --- | --- | --- |
| `window.PROTOCORD_RUNTIME_CONFIG` | Objeto | Configuração injetada antes da carga da aplicação. |
| `window.PROTOCORD_API_BASE_URL` | Texto | URL base resolvida para chamadas HTTP. |
| `window.PROTOCORD_API_SERVER_ORIGIN` | Texto | Origem do servidor sem o sufixo `/api`. |
| `window.getProtocordApiUrl(path)` | Função | Monta rotas consistentes para o servidor. |
| `registrosCache` | Lista | Cache de protocolos em módulos específicos. |
| `protocolosCache` | Objeto | Índice de protocolos por PRT. |

## 6. Persistência Local

A interface utiliza `localStorage` para configurações de execução, preferências visuais, sessão de autenticação e caches de conveniência. Esses dados não substituem o servidor como fonte de verdade.

## 7. Contratos De Comunicação

A interface espera respostas JSON das rotas documentadas no projeto do servidor. Novas telas devem evitar a exposição de campos técnicos sem tradução para linguagem operacional.

## 8. Testes

```bash
npm test
```

Os testes validam trechos críticos de código-fonte e fluxos essenciais sem exigir navegador real.

## 9. Recomendações De Manutenção

- Centralizar novas chamadas HTTP em `window.getProtocordApiUrl(path)`.
- Não inserir segredos no código da interface.
- Converter respostas técnicas em linguagem compreensível para o usuário final.
- Revisar textos e codificação em UTF-8 ao alterar arquivos históricos.
