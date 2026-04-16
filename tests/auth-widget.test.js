const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const authSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'auth.js'),
  'utf8'
);

const assistantSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'ia-assistant.js'),
  'utf8'
);

const htmlSource = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

test('auth dispara evento quando estado de autenticacao muda', () => {
  assert.match(authSource, /CustomEvent\('protocord:auth-changed'/);
  assert.match(authSource, /window\.hasActiveAuthSession = hasActiveAuthSession/);
});

test('widget respeita autenticacao antes de abrir e nasce oculto no HTML', () => {
  assert.match(assistantSource, /if \(!state\.authenticated\) \{\s*return;/);
  assert.match(assistantSource, /syncAssistantVisibility/);
  assert.match(htmlSource, /id="assistant-widget" class="assistant-widget hidden" hidden aria-hidden="true"/);
});
