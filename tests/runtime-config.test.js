const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const runtimeConfigSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'runtime-config.js'),
  'utf8'
);

<<<<<<< HEAD
function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ?data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

=======
// Monta ou cria a estrutura necessaria para esta etapa (create storage).
function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    // Busca ou resolve informacoes necessarias para o fluxo (get item).
    getItem(key) {
      return data.has(key) ?data.get(key) : null;
    },
    // Aplica valores, estado visual ou configuracoes no fluxo atual (set item).
    setItem(key, value) {
      data.set(key, String(value));
    },
    // Remove itens, dados ou estado relacionado a esta funcionalidade (remove item).
    removeItem(key) {
      data.delete(key);
    },
  };
}

// Explica a responsabilidade de run runtime config dentro deste modulo.
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
function runRuntimeConfig({ runtimeConfig, storageValues } = {}) {
  const sandbox = {
    window: {
      PROTOCORD_RUNTIME_CONFIG: runtimeConfig || {},
<<<<<<< HEAD
    },
    localStorage: createStorage(storageValues),
  };

  sandbox.window.localStorage = sandbox.localStorage;
=======
      // Busca ou resolve informacoes necessarias para o fluxo (fetch).
      fetch() {
        return Promise.resolve({ ok: true });
      },
    },
    localStorage: createStorage(storageValues),
    Headers,
  };

  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.fetch = sandbox.window.fetch.bind(sandbox.window);
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
  vm.runInNewContext(runtimeConfigSource, sandbox);
  return sandbox.window;
}

test('runtime-config prioriza API_BASE_URL injetada em tempo de execucao', () => {
  const result = runRuntimeConfig({
    runtimeConfig: {
      API_BASE_URL: 'https://api.exemplo.com/custom/',
    },
  });

  assert.equal(result.PROTOCORD_API_BASE_URL, 'https://api.exemplo.com/custom');
  assert.equal(result.PROTOCORD_API_SERVER_ORIGIN, 'https://api.exemplo.com/custom');
  assert.equal(result.getProtocordApiUrl('/assistente'), 'https://api.exemplo.com/custom/assistente');
});

test('runtime-config usa localStorage como fallback quando nao ha configuracao injetada', () => {
  const result = runRuntimeConfig({
    storageValues: {
      PROTOCORD_API_BASE_URL: 'https://persistido.exemplo.com/api/',
    },
  });

  assert.equal(result.PROTOCORD_API_BASE_URL, 'https://persistido.exemplo.com/api');
  assert.equal(result.PROTOCORD_API_SERVER_ORIGIN, 'https://persistido.exemplo.com');
});
<<<<<<< HEAD
=======

test('runtime-config anexa token somente em chamadas para a API configurada', async () => {
  let capturedHeaders;
  const sandbox = {
    window: {
      PROTOCORD_RUNTIME_CONFIG: { API_BASE_URL: 'https://api.exemplo.com/api' },
      getProtocordAuthToken: () => 'session-token',
      // Busca ou resolve informacoes necessarias para o fluxo (fetch).
      fetch(_url, init) {
        capturedHeaders = init?.headers;
        return Promise.resolve({ ok: true });
      },
    },
    localStorage: createStorage(),
    Headers,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.fetch = sandbox.window.fetch.bind(sandbox.window);

  vm.runInNewContext(runtimeConfigSource, sandbox);
  await sandbox.window.fetch('https://api.exemplo.com/api/protocolos');

  assert.equal(new Headers(capturedHeaders).get('authorization'), 'Bearer session-token');
});

test('runtime-config limpa sessao local quando API autenticada responde 401', async () => {
  const storage = createStorage({
    authToken: 'payload.signature',
    authTime: '2026-04-27T10:00:00.000Z',
  });
  let authEvent;
  const sandbox = {
    window: {
      PROTOCORD_RUNTIME_CONFIG: { API_BASE_URL: 'https://api.exemplo.com/api' },
      getProtocordAuthToken: () => storage.getItem('authToken'),
      addEventListener() {},
      // Explica a responsabilidade de dispatch event dentro deste modulo.
      dispatchEvent(event) {
        authEvent = event;
      },
      // Busca ou resolve informacoes necessarias para o fluxo (fetch).
      fetch() {
        return Promise.resolve({ ok: false, status: 401 });
      },
    },
    localStorage: storage,
    CustomEvent,
    Headers,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.fetch = sandbox.window.fetch.bind(sandbox.window);

  vm.runInNewContext(runtimeConfigSource, sandbox);
  await sandbox.window.fetch('https://api.exemplo.com/api/protocolos');

  assert.equal(storage.getItem('authToken'), null);
  assert.equal(storage.getItem('authTime'), null);
  assert.equal(authEvent.type, 'protocord:auth-changed');
  assert.equal(authEvent.detail.authenticated, false);
});
>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
