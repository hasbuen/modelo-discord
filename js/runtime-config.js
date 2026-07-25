(function () {
<<<<<<< HEAD
  const DEFAULT_API_BASE_URL = "https://modelo-discord-server.vercel.app/api";

=======
  // Ponto unico de resolucao da API: permite trocar backend por configuracao
  // injetada ou localStorage sem editar os modulos da interface.
  const DEFAULT_API_BASE_URL = "https://modelo-discord-server.vercel.app/api";

  // Normaliza, interpreta ou formata dados para uso seguro (normalize api base url).
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
  function normalizeApiBaseUrl(value) {
    const fallback = DEFAULT_API_BASE_URL;
    const normalized = String(value || fallback).trim();
    return normalized ?normalized.replace(/\/+$/, "") : fallback;
  }

<<<<<<< HEAD
=======
  // Explica a responsabilidade de to api url dentro deste modulo.
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
  function toApiUrl(path) {
    const baseUrl = window.PROTOCORD_API_BASE_URL || DEFAULT_API_BASE_URL;
    if (!path) return baseUrl;
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = String(path).startsWith("/") ?path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  const runtimeConfig = window.PROTOCORD_RUNTIME_CONFIG || {};
  const apiBaseUrl = normalizeApiBaseUrl(
    runtimeConfig.API_BASE_URL ||
    window.PROTOCORD_TRANSCRIBER_API ||
    localStorage.getItem("PROTOCORD_API_BASE_URL") ||
    localStorage.getItem("PROTOCORD_TRANSCRIBER_API") ||
    DEFAULT_API_BASE_URL
  );

  const apiServerOrigin = apiBaseUrl.replace(/\/api$/i, "");

  window.PROTOCORD_RUNTIME_CONFIG = {
    ...runtimeConfig,
    API_BASE_URL: apiBaseUrl,
    API_SERVER_ORIGIN: apiServerOrigin,
  };
  window.PROTOCORD_API_BASE_URL = apiBaseUrl;
  window.PROTOCORD_API_SERVER_ORIGIN = apiServerOrigin;
  window.PROTOCORD_TRANSCRIBER_API = apiBaseUrl;
  window.getProtocordApiBaseUrl = function () {
    return window.PROTOCORD_API_BASE_URL;
  };
  window.getProtocordApiUrl = toApiUrl;
<<<<<<< HEAD
=======

  window.getProtocordAuthHeaders = function () {
    const token = typeof window.getProtocordAuthToken === "function"
      ? window.getProtocordAuthToken()
      : localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}`, "X-ProtoCord-Session": token } : {};
  };

  // Limpa dados temporarios ou restaura o estado inicial (clear invalid session).
  function clearInvalidSession() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authTime");
    window.dispatchEvent(new CustomEvent("protocord:auth-changed", {
      detail: { authenticated: false },
    }));
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function protocordSecureFetch(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url;
    const shouldAttachAuth = typeof url === "string" && url.startsWith(apiBaseUrl);
    if (!shouldAttachAuth) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined) || {});
    Object.entries(window.getProtocordAuthHeaders()).forEach(([key, value]) => {
      if (value && !headers.has(key)) headers.set(key, value);
    });

    return nativeFetch(input, { ...init, headers }).then((response) => {
      const isAuthRequest = typeof url === "string" && url.includes("/autenticacao");
      if (response?.status === 401 && !isAuthRequest) {
        clearInvalidSession();
      }
      return response;
    });
  };
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
})();
