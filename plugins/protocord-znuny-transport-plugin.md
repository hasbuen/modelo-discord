# ProtoCord Znuny Transport Plugin

Plugin interno carregado pela propria interface do ProtoCord.

## O que ele faz

- Adiciona um botao de configuracao com icone de cog no cabecalho lateral da pagina `Transcrever`.
- Usa o endereco fixo do Znuny internamente, sem expor esse dado ao usuario.
- Recebe o pacote gerado pelo botao `Transportar`.
- Salva `znuny_auto_payload` como fallback e copia o relatorio em texto/HTML para a area de transferencia.
- Inclui as evidencias visuais coladas no fim do relatorio transportado, como imagens embutidas no HTML.
- Quando a extensao `protocord-znuny-extension` esta instalada, envia o transporte para ela abrir e preencher o Znuny.
- Sem a extensao, ainda abre uma nova aba com a tela de novo ticket como fallback.
- Mantem uma pre-visualizacao do assunto, contato e relatorio transportado.
- Permite copiar o relatorio como fallback operacional.
- Inclui um assistente de instalacao em 3 passos dentro do mini-app.
- Mostra primeiro a area `Extensao do navegador`, com link para baixar a release `plugins/releases/protocord-znuny-extension-v1.0.0.zip`.

## Configuracao

Abra o cog dentro da pagina `Transcrever` e informe:

- Campos do ticket: assunto, contato, editor, fila, tipo, estado, atendente, prioridade, servico e SLA

O plugin salva estes valores em:

```js
localStorage.PROTOCORD_ZNUNY_FIELD_CONFIG
localStorage.znuny_auto_payload
```

A URL do portal e a URL de novo ticket ficam ocultas no painel, pois sao fixas. Os campos do ticket continuam editaveis com labels de negocio e valores padrao ja preenchidos.

## Observacao importante

Por seguranca do navegador, um script carregado no dominio do ProtoCord nao consegue preencher campos dentro de outro dominio depois que a aba do Znuny abre. O plugin interno resolve o transporte, configuracao, abertura da aba e fallback de copia.

Para preenchimento automatico dentro da pagina do Znuny, baixe a release em `plugins/releases/protocord-znuny-extension-v1.0.0.zip` pelo cog da pagina Transcrever. A extensao roda no ProtoCord e no dominio serviceup da Rhede, recebe o payload sem clipboard e preenche `Subject`, `DynamicField_Contato`, CKEditor RichText e os campos configurados do atendimento.

Browsers Chromium nao permitem instalacao silenciosa de extensoes por um site comum fora das lojas oficiais ou de politica corporativa. Por isso o ProtoCord entrega um assistente guiado tipo proximo/proximo/concluir, mas a etapa de habilitar extensao continua exigindo confirmacao do usuario ou publicacao em loja.
