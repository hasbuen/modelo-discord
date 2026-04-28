# Plugins ProtoCord

## ProtoCord Znuny Transport

Pasta: `protocord-znuny-extension/`

Use esta extensao propria do ProtoCord no Chrome, Edge ou Opera para transportar o relatorio do ticket ativo para a tela de novo ticket do Znuny.

Fluxo:

1. No ProtoCord, clique em `Transportar`.
2. A extensao captura o payload com `contato`, `assunto` e `relatorio`, enquanto o ProtoCord copia o relatorio em texto/HTML para a area de transferencia.
3. A extensao abre `/znuny/index.pl?Action=AgentTicketPhone`.
4. O content script do Znuny preenche `Subject`, `DynamicField_Contato`, CKEditor RichText e os campos fixos de fila, tipo, estado, proprietario, prioridade, servico e SLA. A aplicacao so considera o transporte concluido quando o relatorio tambem entra no editor.

Instalacao:

1. Abra `chrome://extensions`, `edge://extensions` ou `opera://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em `Carregar sem compactacao`.
4. Selecione `modelo-discord/plugins/protocord-znuny-extension`.

Assistente e configuracao:

- Pelo ProtoCord: na pagina `Transcrever`, clique no cog do plugin, use `Como instalar` para o fluxo guiado e ajuste `Mapeamento dos campos`.
- Pelo navegador: clique no icone da extensao e ajuste os mesmos campos no popup.

Observacao: Chrome, Edge e Opera nao permitem instalacao silenciosa por uma pagina web fora da loja oficial ou de politica corporativa. O assistente reduz o passo a passo, mas a confirmacao do navegador continua obrigatoria.
