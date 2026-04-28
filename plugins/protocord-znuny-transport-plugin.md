# ProtoCord Znuny Transport Plugin

Plugin interno carregado pela propria interface do ProtoCord.

## O que ele faz

- Adiciona o mini-app `Znuny` no canto inferior esquerdo da tela.
- Guarda a configuracao do portal Znuny no navegador.
- Recebe o pacote gerado pelo botao `Transportar`.
- Abre uma nova aba com a tela de novo ticket do Znuny.
- Mantem uma pre-visualizacao do assunto, contato e relatorio transportado.
- Permite copiar o relatorio como fallback operacional.

## Configuracao

Abra o botao `Znuny` dentro do ProtoCord e informe:

- `Portal Znuny`: URL base do portal, por exemplo `https://seu-portal.example.com`
- `URL de novo ticket`: opcional, use quando a rota padrao nao for `Action=AgentTicketPhone`

O plugin salva estes valores em:

```js
localStorage.PROTOCORD_ZNUNY_BASE_URL
localStorage.PROTOCORD_ZNUNY_TICKET_URL
```

## Observacao importante

Por seguranca do navegador, um script carregado no dominio do ProtoCord nao consegue preencher campos dentro de outro dominio depois que a aba do Znuny abre. O plugin interno resolve o transporte, configuracao, abertura da aba e fallback de copia.

Para preenchimento automatico dentro da pagina do Znuny, ainda e necessario um complemento executando tambem no dominio do Znuny, como extensao corporativa ou userscript.
