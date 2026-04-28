const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const transcriberSource = fs.readFileSync(path.join(root, 'js', 'ia-transcriber.js'), 'utf8');
const pluginSource = fs.readFileSync(path.join(root, 'js', 'protocord-znuny-transport-plugin.js'), 'utf8');
const readmeSource = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const mapGeneratorSource = fs.readFileSync(path.join(root, 'scripts', 'gerar-mapa-codigo.mjs'), 'utf8');
const manualGeneratorSource = fs.readFileSync(path.join(root, 'scripts', 'gerar-manual-transcrever-cordia.mjs'), 'utf8');

test('plugin interno de transporte Znuny carrega antes do transcritor', () => {
  const pluginIndex = indexSource.indexOf('js/protocord-znuny-transport-plugin.js');
  const transcriberIndex = indexSource.indexOf('js/ia-transcriber.js');

  assert.notEqual(pluginIndex, -1, 'script do plugin Znuny nao foi incluido no index');
  assert.notEqual(transcriberIndex, -1, 'script do transcritor nao foi encontrado no index');
  assert.ok(pluginIndex < transcriberIndex, 'plugin precisa carregar antes do transcritor');
});

test('botao Transportar delega para o plugin interno antes do fallback legado', () => {
  const payloadIndex = transcriberSource.indexOf('buildZnunyTransportPayload(active)');
  const pluginIndex = transcriberSource.indexOf('window.ProtoCordZnunyTransport?.handleTransport?.(payload)');
  const eventIndex = transcriberSource.indexOf('emitZnunyTransport(payload)');
  const openIndex = transcriberSource.indexOf('window.open(ticketUrl, "_blank", "noopener,noreferrer")');

  assert.ok(payloadIndex > -1, 'payload estruturado nao foi encontrado');
  assert.ok(pluginIndex > payloadIndex, 'plugin deve receber o payload preparado');
  assert.ok(eventIndex > pluginIndex, 'evento externo deve ser fallback depois do plugin');
  assert.ok(openIndex > pluginIndex, 'abertura direta deve ser fallback depois do plugin');
});

test('plugin expõe API, armazenamento e app proprio do ProtoCord', () => {
  assert.match(pluginSource, /window\.ProtoCordPlugins/);
  assert.match(pluginSource, /window\.ProtoCordZnunyTransport = plugin/);
  assert.match(pluginSource, /handleTransport/);
  assert.match(pluginSource, /openApp/);
  assert.match(pluginSource, /protocord-znuny-plugin-launcher/);
  assert.match(pluginSource, /protocord-znuny-plugin-app/);
  assert.match(pluginSource, /PROTOCORD_ZNUNY_BASE_URL/);
  assert.match(pluginSource, /PROTOCORD_ZNUNY_TICKET_URL/);
  assert.match(pluginSource, /AgentTicketPhone/);
});

test('README referencia assets versionados e existentes', () => {
  const imageRefs = [...readmeSource.matchAll(/!\[[^\]]+\]\((docs\/assets\/[^)]+)\)/g)]
    .map((match) => match[1]);

  assert.ok(imageRefs.includes('docs/assets/arquitetura-interface.svg'));
  assert.ok(imageRefs.includes('docs/assets/mapa-funcional-interface.svg'));

  for (const ref of imageRefs) {
    const fullPath = path.join(root, ref);
    assert.ok(fs.existsSync(fullPath), `${ref} nao existe`);
    assert.ok(fs.statSync(fullPath).size > 500, `${ref} parece vazio`);
  }
});

test('geradores de documentacao conhecem o plugin Znuny', () => {
  assert.equal(packageJson.scripts['docs:map'], 'node scripts/gerar-mapa-codigo.mjs && node scripts/gerar-mapa-codigo-3d.mjs');
  assert.equal(packageJson.scripts['docs:manual'], 'node scripts/gerar-manual-usuario.mjs && node scripts/gerar-manual-transcrever-cordia.mjs');
  assert.equal(packageJson.scripts['docs:update'], 'npm run docs:map && npm run docs:manual');

  assert.match(mapGeneratorSource, /protocord-znuny-transport-plugin\.js/);
  assert.match(mapGeneratorSource, /Transcrever, CordIA e plugins/);
  assert.match(manualGeneratorSource, /04-plugin-znuny\.png/);
  assert.match(manualGeneratorSource, /Plugin de transporte Znuny/);
});
