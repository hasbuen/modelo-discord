# ProtoCord Znuny Transport

Extensao propria do ProtoCord para Chrome, Edge e Opera.

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

1. Abra `chrome://extensions`, `edge://extensions` ou `opera://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em `Carregar sem compactacao`.
4. Selecione a pasta `modelo-discord/plugins/protocord-znuny-extension`.
5. Abra o ProtoCord, entre em `Transcrever` e clique em `Transportar`.

O cog dentro da pagina `Transcrever` abre um assistente de instalacao em 3 passos. Ele orienta o caminho da extensao e valida o status, mas o navegador ainda exige confirmacao manual quando a extensao nao vem da loja oficial.

## Configurar campos

Voce pode configurar os campos de duas formas:

- No ProtoCord: abra o cog da pagina `Transcrever`, clique em `Como instalar` para ver o assistente e ajuste o bloco `Mapeamento dos campos`.
- Na extensao: clique no icone `ProtoCord Znuny` do navegador e edite os campos no popup.

Campos configuraveis:

- Campo de assunto
- Campo de contato
- Campo do editor
- Campos fixos `Dest`, `TypeID`, `NextStateID`, `NewUserID`, `PriorityID`, `ServiceID` e `SLAID`

As configuracoes ficam em `chrome.storage.local` da propria extensao.

## Arquitetura

- `content-protocord.js`: roda no ProtoCord e envia o payload para a extensao.
- `background.js`: guarda o payload e abre a aba do Znuny.
- `content-znuny.js`: roda no Znuny e preenche os campos.
- `popup.*`: mini painel da extensao com o ultimo transporte.
