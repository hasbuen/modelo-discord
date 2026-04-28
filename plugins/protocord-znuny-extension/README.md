# ProtoCord Znuny Transport

Extensao propria do ProtoCord para Chrome, Edge e Opera.

Release local: `../releases/protocord-znuny-extension-v1.0.0.zip`

## O que ela faz

- Escuta o botao `Transportar` dentro do ProtoCord.
- Recebe o payload com `contato`, `assunto` e `relatorio` diretamente da pagina Transcrever.
- Abre uma nova aba em `/znuny/index.pl?Action=AgentTicketPhone`.
- Preenche automaticamente no Znuny:
  - `Subject`
  - `DynamicField_Contato`
  - editor `RichText`/CKEditor
  - `Dest`
  - `TypeID`
  - `NextStateID`
  - `NewUserID`
  - `PriorityID`
  - `ServiceID`
  - `SLAID`

## Instalar no navegador

1. No ProtoCord, abra `Transcrever` e clique no cog.
2. Em `Extensao do navegador`, clique em `Baixar extensao`.
3. Extraia o arquivo ZIP em uma pasta permanente.
4. Abra `chrome://extensions`, `edge://extensions` ou `opera://extensions`.
5. Ative o modo de desenvolvedor.
6. Clique em `Carregar sem compactacao` e selecione a pasta extraida.
7. Abra o ProtoCord, entre em `Transcrever` e clique em `Transportar`.

O cog dentro da pagina `Transcrever` abre um assistente de instalacao em 3 passos. Ele orienta o caminho da extensao e valida o status, mas o navegador ainda exige confirmacao manual quando a extensao nao vem da loja oficial.

## Configurar campos

Voce pode configurar os campos de duas formas:

- No ProtoCord: abra o cog da pagina `Transcrever`, baixe a release e clique em `Como instalar` para ver o assistente.
- Na extensao: clique no icone `ProtoCord Znuny` do navegador e edite os campos no popup.

Campos configuraveis:

- Campo de assunto
- Campo de contato
- Campo do editor
- Fila, tipo, estado, atendente, prioridade, servico e SLA

O portal e a URL de novo ticket sao fixos e nao aparecem para o usuario. Os nomes internos `Dest`, `TypeID`, `NextStateID`, `NewUserID`, `PriorityID`, `ServiceID` e `SLAID` continuam sendo usados pela extensao para preencher o Znuny.

As configuracoes ficam em `chrome.storage.local` da propria extensao.

## Arquitetura

- `content-protocord.js`: roda no ProtoCord e envia o payload para a extensao.
- `background.js`: guarda o payload e abre a aba do Znuny.
- `content-znuny.js`: roda no Znuny e preenche os campos.
- `popup.*`: mini painel da extensao com o ultimo transporte.
