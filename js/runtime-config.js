(function () {
  const DEFAULT_API_BASE_URL = "https://modelo-discord-server.vercel.app/api";

  function normalizeApiBaseUrl(value) {
    const fallback = DEFAULT_API_BASE_URL;
    const normalized = String(value || fallback).trim();
    return normalized ?normalized.replace(/\/+$/, "") : fallback;
  }

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
})();
