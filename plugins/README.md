# Plugins ProtoCord

## ProtoCord Znuny Transport

Pasta fonte: `protocord-znuny-extension/`
Release baixavel: `releases/protocord-znuny-extension-v1.0.0.zip`

Use esta extensao propria do ProtoCord no Chrome, Edge ou Opera para transportar o relatorio do ticket ativo para a tela de novo ticket do Znuny.

Fluxo:

1. No ProtoCord, clique em `Transportar`.
2. A extensao captura o payload com `contato`, `assunto`, `relatorio` e evidencias embutidas no HTML, enquanto o ProtoCord copia o relatorio em texto/HTML para a area de transferencia.
3. A extensao abre `/znuny/index.pl?Action=AgentTicketPhone`.
4. O content script do Znuny preenche `Subject`, `DynamicField_Contato`, CKEditor RichText e os campos configuraveis de fila, tipo, estado, atendente, prioridade, servico e SLA. A aplicacao so considera o transporte concluido quando o relatorio tambem entra no editor.

Instalacao:

1. No ProtoCord, abra o cog da pagina `Transcrever`.
2. Em `Extensao do navegador`, clique em `Baixar extensao`.
3. Extraia o ZIP da release em uma pasta permanente.
4. Abra `chrome://extensions`, `edge://extensions` ou `opera://extensions`.
5. Ative o modo de desenvolvedor.
6. Clique em `Carregar sem compactacao` e selecione a pasta extraida da release.

Assistente e configuracao:

- Pelo ProtoCord: na pagina `Transcrever`, clique no cog do plugin, baixe a release, use `Como instalar` e ajuste os campos do ticket com labels de negocio.
- Pelo navegador: clique no icone da extensao e ajuste os mesmos campos no popup.

O portal e a URL de novo ticket ficam fixos e ocultos para o usuario.

Observacao: Chrome, Edge e Opera nao permitem instalacao silenciosa por uma pagina web fora da loja oficial ou de politica corporativa. O assistente reduz o passo a passo, mas a confirmacao do navegador continua obrigatoria.
