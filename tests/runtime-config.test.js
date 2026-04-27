const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const runtimeConfigSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'runtime-config.js'),
  'utf8'
);

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

function runRuntimeConfig({ runtimeConfig, storageValues } = {}) {
  const sandbox = {
    window: {
      PROTOCORD_RUNTIME_CONFIG: runtimeConfig || {},
      fetch() {
        return Promise.resolve({ ok: true });
      },
    },
    localStorage: createStorage(storageValues),
    Headers,
  };

  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.fetch = sandbox.window.fetch.bind(sandbox.window);
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

test('runtime-config anexa token somente em chamadas para a API configurada', async () => {
  let capturedHeaders;
  const sandbox = {
    window: {
      PROTOCORD_RUNTIME_CONFIG: { API_BASE_URL: 'https://api.exemplo.com/api' },
      getProtocordAuthToken: () => 'session-token',
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
