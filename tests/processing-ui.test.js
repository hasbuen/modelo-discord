const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const transcriberSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'ia-transcriber.js'),
  'utf8'
);

test('transcritor renderiza overlay de processamento bloqueante e sincroniza com state.uploading', () => {
  assert.match(transcriberSource, /id="ia-processing-overlay"/);
  assert.match(transcriberSource, /id="ia-processing-message"/);
  assert.match(transcriberSource, /els\.processingOverlay\?\.classList\.toggle\("hidden", !state\.uploading\)/);
  assert.match(transcriberSource, /els\.page\?\.setAttribute\("aria-busy", state\.uploading \? "true" : "false"\)/);
});
