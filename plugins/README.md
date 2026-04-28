# Plugins ProtoCord

## ProtoCord Znuny Transporter

Arquivo: `protocord-znuny-transporter.user.js`

Use este userscript no Tampermonkey para transportar o relatorio do ticket ativo do ProtoCord para a tela de novo ticket do Znuny.

Fluxo:

1. No ProtoCord, clique em `Transportar`.
2. O frontend salva um pacote temporario com contato, assunto e relatorio.
3. O userscript guarda o pacote no storage do Tampermonkey.
4. A aba do Znuny e aberta, se a URL estiver configurada.
5. Na tela de novo ticket, o userscript tenta preencher assunto, cliente/contato e corpo.

Configuracao recomendada no console do navegador do ProtoCord:

```js
localStorage.setItem("PROTOCORD_ZNUNY_BASE_URL", "https://seu-portal.example.com");
```

Ou informe a rota completa:

```js
localStorage.setItem("PROTOCORD_ZNUNY_TICKET_URL", "https://seu-portal.example.com/znuny/index.pl?Action=AgentTicketPhone");
```

Se preferir deixar a URL fixa dentro do Tampermonkey, edite `znunyNewTicketUrl` no bloco `CONFIG` do userscript.
