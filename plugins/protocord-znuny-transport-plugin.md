# ProtoCord Znuny Transport Plugin

Plugin interno carregado pela propria interface do ProtoCord.

## O que ele faz

- Adiciona um botao de configuracao com icone de cog no cabecalho lateral da pagina `Transcrever`.
- Guarda a configuracao do portal Znuny no navegador.
- Recebe o pacote gerado pelo botao `Transportar`.
- Salva `znuny_auto_payload` como fallback e copia o relatorio em texto/HTML para a area de transferencia.
- Quando a extensao `protocord-znuny-extension` esta instalada, envia o transporte para ela abrir e preencher o Znuny.
- Sem a extensao, ainda abre uma nova aba com a tela de novo ticket como fallback.
- Mantem uma pre-visualizacao do assunto, contato e relatorio transportado.
- Permite copiar o relatorio como fallback operacional.
- Inclui um assistente de instalacao em 3 passos dentro do mini-app.

## Configuracao

Abra o cog dentro da pagina `Transcrever` e informe:

- `Portal Znuny`: URL base do portal serviceup da Rhede
- `URL de novo ticket`: opcional, use quando a rota padrao nao for `Action=AgentTicketPhone`

O plugin salva estes valores em:

```js
localStorage.PROTOCORD_ZNUNY_BASE_URL
localStorage.PROTOCORD_ZNUNY_TICKET_URL
localStorage.znuny_auto_payload
```

## Observacao importante

Por seguranca do navegador, um script carregado no dominio do ProtoCord nao consegue preencher campos dentro de outro dominio depois que a aba do Znuny abre. O plugin interno resolve o transporte, configuracao, abertura da aba e fallback de copia.

Para preenchimento automatico dentro da pagina do Znuny, instale a extensao propria em `plugins/protocord-znuny-extension`. Ela roda no ProtoCord e no dominio serviceup da Rhede, recebe o payload sem clipboard e preenche `Subject`, `DynamicField_Contato`, CKEditor RichText e os campos fixos do atendimento.

Browsers Chromium nao permitem instalacao silenciosa de extensoes por um site comum fora das lojas oficiais ou de politica corporativa. Por isso o ProtoCord entrega um assistente guiado tipo proximo/proximo/concluir, mas a etapa de habilitar extensao continua exigindo confirmacao do usuario ou publicacao em loja.
