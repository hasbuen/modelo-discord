const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const transcriberSource = fs.readFileSync(path.join(root, 'js', 'ia-transcriber.js'), 'utf8');
const pluginSource = fs.readFileSync(path.join(root, 'js', 'protocord-znuny-transport-plugin.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const extensionRoot = path.join(root, 'plugins', 'protocord-znuny-extension');
const extensionManifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8'));
const extensionBackground = fs.readFileSync(path.join(extensionRoot, 'background.js'), 'utf8');
const extensionProtocord = fs.readFileSync(path.join(extensionRoot, 'content-protocord.js'), 'utf8');
const extensionZnuny = fs.readFileSync(path.join(extensionRoot, 'content-znuny.js'), 'utf8');
const extensionPopupHtml = fs.readFileSync(path.join(extensionRoot, 'popup.html'), 'utf8');
const extensionPopupJs = fs.readFileSync(path.join(extensionRoot, 'popup.js'), 'utf8');
const extensionReleasePath = path.join(root, 'plugins', 'releases', 'protocord-znuny-extension-v1.0.0.zip');
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
  assert.match(transcriberSource, /function buildEvidenceHtml/);
  assert.match(transcriberSource, /<strong>Evidencias<\/strong>/);
  assert.match(transcriberSource, /src: image/);
});

test('plugin expõe API, armazenamento e app proprio do ProtoCord', () => {
  assert.match(pluginSource, /window\.ProtoCordPlugins/);
  assert.match(pluginSource, /window\.ProtoCordZnunyTransport = plugin/);
  assert.match(pluginSource, /handleTransport/);
  assert.match(pluginSource, /openApp/);
  assert.match(pluginSource, /protocord-znuny-plugin-launcher/);
  assert.match(pluginSource, /protocord-znuny-plugin-app/);
  assert.match(pluginSource, /findLauncherHost/);
  assert.match(pluginSource, /querySelector\("\.ia-sidebar-header"\)/);
  assert.match(pluginSource, /querySelector\("\.ia-sidebar-top"\)/);
  assert.match(pluginSource, /data-lucide="settings"/);
  assert.match(pluginSource, /position:\s*absolute/);
  assert.match(pluginSource, /right:\s*22px/);
  assert.doesNotMatch(pluginSource, /docs-easter-brand/);
  assert.match(pluginSource, /PROTOCORD_ZNUNY_BASE_URL/);
  assert.match(pluginSource, /PROTOCORD_ZNUNY_TICKET_URL/);
  assert.match(pluginSource, /znuny_auto_payload/);
  assert.match(pluginSource, /\["rhede", "serviceup", "app"\]\.join\("\."\)/);
  assert.match(pluginSource, /znuny\/index\.pl\?Action=AgentTicketPhone/);
  assert.match(pluginSource, /copyPayloadToClipboard/);
  assert.match(pluginSource, /ClipboardItem/);
  assert.match(pluginSource, /"text\/html"/);
  assert.match(pluginSource, /"text\/plain"/);
  assert.match(pluginSource, /toZnunyClipboardPayload/);
  assert.match(pluginSource, /notifyBrowserExtension/);
  assert.match(pluginSource, /protocordZnunyExtension/);
  assert.match(pluginSource, /PROTOCORD_ZNUNY_TRANSPORT/);
  assert.match(pluginSource, /data-znuny-install/);
  assert.match(pluginSource, /protocord-znuny-extension-v1\.0\.0\.zip/);
  assert.match(pluginSource, /data-znuny-download/);
  assert.match(pluginSource, /--znuny-plugin-shell-bg/);
  assert.match(pluginSource, /html\[data-theme="light"\]/);
  assert.match(pluginSource, /data-znuny-step-next/);
  assert.match(pluginSource, /updateInstallWizard/);
  assert.doesNotMatch(pluginSource, />URL de novo ticket</);
  assert.doesNotMatch(pluginSource, />Portal Znuny</);
  assert.doesNotMatch(pluginSource, /Mapeamento dos campos/);
  assert.match(pluginSource, />Campos do ticket</);
  assert.match(pluginSource, />Fila</);
  assert.match(pluginSource, />Tipo</);
  assert.match(pluginSource, />Atendente</);
  assert.match(pluginSource, />Prioridade</);
  assert.match(pluginSource, />Servico</);
  assert.match(pluginSource, /data-znuny-fixed-field="Dest"/);
  assert.match(pluginSource, /ServiceID:\s*"93"/);
  assert.match(pluginSource, /PROTOCORD_ZNUNY_CONFIG_SAVE/);
  assert.match(pluginSource, /AgentTicketPhone/);
  assert.match(styleSource, /\[data-theme="light"\] \.assistant-widget-panel/);
  assert.match(styleSource, /\[data-theme="light"\] \.assistant-fab/);
  assert.match(styleSource, /\[data-theme="light"\] \.assistant-form-widget \.assistant-input/);
  assert.match(styleSource, /html\[data-theme="light"\] \.docs-easter-menu/);
});

test('extensao propria MV3 cobre ProtoCord e Znuny sem Tampermonkey', () => {
  assert.equal(extensionManifest.manifest_version, 3);
  assert.equal(extensionManifest.name, 'ProtoCord Znuny Transport');
  assert.deepEqual(extensionManifest.permissions, ['storage', 'tabs']);
  assert.ok(extensionManifest.host_permissions.includes('https://*.serviceup.app/*'));
  assert.ok(extensionManifest.content_scripts.some((entry) => entry.js.includes('content-protocord.js')));
  assert.ok(extensionManifest.content_scripts.some((entry) => entry.js.includes('content-znuny.js')));
  assert.equal(extensionManifest.background.service_worker, 'background.js');
  assert.equal(extensionManifest.action.default_popup, 'popup.html');
  assert.ok(fs.existsSync(extensionReleasePath), 'release zip da extensao nao foi gerado');
  assert.ok(fs.statSync(extensionReleasePath).size > 1000, 'release zip da extensao parece vazio');
  assert.ok(!fs.existsSync(path.join(root, 'plugins', 'protocord-znuny-transporter.user.js')), 'nao deve existir userscript Tampermonkey');

  assert.match(extensionBackground, /chrome\.tabs\.create/);
  assert.match(extensionBackground, /\["rhede", "serviceup", "app"\]\.join\("\."\)/);
  assert.match(extensionBackground, /PROTOCORD_ZNUNY_CONFIG_SAVE/);
  assert.match(extensionBackground, /fieldConfig/);
  assert.match(extensionProtocord, /document\.documentElement\.dataset\.protocordZnunyExtension = "ready"/);
  assert.match(extensionProtocord, /PROTOCORD_ZNUNY_TRANSPORT/);
  assert.match(extensionProtocord, /PROTOCORD_ZNUNY_OPEN/);
  assert.match(extensionProtocord, /PROTOCORD_ZNUNY_CONFIG_SAVE/);
  assert.match(extensionZnuny, /DynamicField_Contato/);
  assert.match(extensionZnuny, /Subject/);
  assert.match(extensionZnuny, /CKEDITOR\.instances\.RichText/);
  assert.match(extensionZnuny, /reportApplied/);
  assert.match(extensionZnuny, /protocordZnunyRichtextApplied/);
  assert.match(extensionZnuny, /return count >= 2 && reportApplied > 0/);
  assert.match(extensionZnuny, /triggerPageChange/);
  assert.match(extensionZnuny, /window\.\$\(el\)\.trigger\("change"\)/);
  assert.match(extensionZnuny, /OwnerSelectionGetAll/);
  assert.match(extensionZnuny, /Dest:\s*"6\|\|Suporte::Suporte i9"/);
  assert.match(extensionZnuny, /TypeID:\s*"3"/);
  assert.match(extensionZnuny, /NextStateID:\s*"13"/);
  assert.match(extensionZnuny, /NewUserID:\s*"8"/);
  assert.match(extensionZnuny, /PriorityID:\s*"2"/);
  assert.match(extensionZnuny, /ServiceID:\s*"93"/);
  assert.match(extensionZnuny, /SLAID:\s*"Media"/);
  assert.match(extensionPopupHtml, /save-config/);
  assert.match(extensionPopupHtml, /data-fixed-field="Dest"/);
  assert.match(extensionPopupJs, /PROTOCORD_ZNUNY_CONFIG_SAVE/);
  assert.match(extensionPopupJs, /renderConfig/);
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
  assert.match(fs.readFileSync(path.join(root, 'scripts', 'gerar-mapa-codigo-3d.mjs'), 'utf8'), /Mesa Neural do Codigo/);
  assert.match(fs.readFileSync(path.join(root, 'scripts', 'gerar-mapa-codigo-3d.mjs'), 'utf8'), /builderMode = true/);
  assert.match(manualGeneratorSource, /04-plugin-znuny\.png/);
  assert.match(manualGeneratorSource, /Plugin de transporte Znuny/);
});
