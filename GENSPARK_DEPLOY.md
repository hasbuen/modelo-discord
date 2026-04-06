# Genspark Deploy

## O que já ficou preparado no frontend

- O projeto agora lê a URL da API por um único ponto de configuração: `window.PROTOCORD_RUNTIME_CONFIG.API_BASE_URL`
- O fallback continua sendo `https://modelo-discord-server.vercel.app/api`
- Todos os fetches do frontend usam `window.getProtocordApiUrl(...)`

## Como configurar sem editar vários arquivos

Antes dos scripts da aplicação, injete:

```html
<script>
  window.PROTOCORD_RUNTIME_CONFIG = {
    API_BASE_URL: "https://seu-backend.com/api"
  };
</script>
```

Alternativa no navegador:

```js
localStorage.setItem("PROTOCORD_API_BASE_URL", "https://seu-backend.com/api");
location.reload();
```

## Envs necessários

### Frontend

- Exposto ao browser: `API_BASE_URL`

### Backend

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN`

## Payloads esperados

### `POST /assistente`

```json
{
  "message": "texto do usuário",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Resposta esperada:

```json
{
  "sucesso": true,
  "resposta": "..."
}
```

### `POST /transcrever` multipart

Campos:

- `audio`: arquivo
- `modo`: `openai`

Resposta esperada:

```json
{
  "sucesso": true,
  "analise": "...",
  "solucao": "...",
  "resumo": "...",
  "telefone": "...",
  "nomeArquivoNoServidor": "...",
  "blobUrl": "https://..."
}
```

### `POST /transcrever` JSON

```json
{
  "blobUrl": "https://...",
  "pathname": "audios/arquivo.webm",
  "filename": "arquivo.webm",
  "contentType": "audio/webm"
}
```

### `DELETE /excluir-audio`

```json
{
  "url": "https://... ou null",
  "pathname": "audios/arquivo.webm ou null"
}
```

## Limite atual

Este repositório não contém o backend. Então a publicação completa ainda depende de:

- acesso ao projeto Genspark/Vercel
- cadastro dos segredos do backend
- código do backend que implementa `/assistente`, `/transcrever`, `/blob-upload`, `/excluir-audio` e `/health`
