export const validarURL = url =>
  /^(http:\/\/|https:\/\/)[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(url);

export const validarNumeros = valor =>
  /^\d+$/.test(valor);
