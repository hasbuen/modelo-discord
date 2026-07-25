const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const transcriberSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'ia-transcriber.js'),
  'utf8'
);

const assistantSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'ia-assistant.js'),
  'utf8'
);

test('transcritor principal prioriza upload em blob antes do fallback legado', () => {
  const blobUploadIndex = transcriberSource.indexOf('uploadAudioToBlob(fileForUpload)');
  const blobRequestIndex = transcriberSource.indexOf('requestBlobTranscription(blobUpload, fileForUpload)');
  const legacyFallbackIndex = transcriberSource.indexOf('sendLegacyTranscriptionRequest(fileForUpload)');

  assert.notEqual(blobUploadIndex, -1, 'fluxo Blob nao encontrado');
  assert.notEqual(blobRequestIndex, -1, 'request JSON de transcricao nao encontrado');
  assert.notEqual(legacyFallbackIndex, -1, 'fallback legado nao encontrado');
  assert.ok(blobUploadIndex < legacyFallbackIndex, 'fallback legado nao pode vir antes do upload em Blob');
  assert.ok(blobRequestIndex < legacyFallbackIndex, 'request JSON deve ocorrer antes do fallback legado');
});

<<<<<<< HEAD
=======
test('player de audio usa icone de volume em vez de texto no botao', () => {
  assert.match(transcriberSource, /id="ia-audio-mute-btn"/);
  assert.match(transcriberSource, /ia-audio-mute-icon-on/);
  assert.match(transcriberSource, /ia-audio-mute-icon-off/);
  assert.match(transcriberSource, /querySelector\("\.ia-audio-mute-icon-on"\)\?\.classList\.toggle\("hidden", muted\)/);
  assert.doesNotMatch(transcriberSource, /Com som/);
  assert.doesNotMatch(transcriberSource, /Sem som/);
});

>>>>>>> a0026365360ce715e3d1e15751d8b3a97946f621
test('assistant tenta transcricao direta e faz fallback para blob-upload', () => {
  assert.match(assistantSource, /handleUploadUrl:\s*`\$\{apiBaseUrl\}\/blob-upload`/);
  assert.match(assistantSource, /fetch\(`\$\{apiBaseUrl\}\/transcrever`/);
  assert.match(assistantSource, /fetch\(`\$\{apiBaseUrl\}\/transcricao-direta`/);
  assert.match(assistantSource, /shouldFallbackToBlobAssistantUpload/);
  assert.ok(
    assistantSource.indexOf('requestDirectAssistantTranscription(apiBaseUrl, file)') <
    assistantSource.indexOf('uploadAudioBlobForAssistant(apiBaseUrl, file)')
  );
});

test('assistant usa hold-to-talk no microfone em vez de clique toggle', () => {
  assert.match(assistantSource, /els\.audioBtn\?\.addEventListener\("pointerdown", handleAudioPressStart\)/);
  assert.match(assistantSource, /els\.audioBtn\?\.addEventListener\("pointerup", handleAudioPressEnd\)/);
  assert.match(assistantSource, /els\.audioBtn\?\.addEventListener\("pointercancel", handleAudioPressCancel\)/);
  assert.match(assistantSource, /window\.addEventListener\("pointerup", handleGlobalAudioPointerEnd, true\)/);
  assert.match(assistantSource, /state\.audioPressActive = true/);
  assert.match(assistantSource, /if \(!state\.audioPressActive\) \{/);
  assert.match(assistantSource, /function handleAudioPressStart\(event\)/);
  assert.match(assistantSource, /function handleAudioPressEnd\(event\)/);
});
