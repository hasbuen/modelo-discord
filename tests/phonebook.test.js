const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlSource = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

const phonebookSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'phonebook.js'),
  'utf8'
);

const transcriberSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'ia-transcriber.js'),
  'utf8'
);

test('agenda telefonica esta disponivel no menu e inicializa pagina propria', () => {
  assert.match(htmlSource, /id="btn-agenda"/);
  assert.match(htmlSource, /id="btn-agenda-mobile"/);
  assert.match(htmlSource, /id="pagina-agenda"/);
  assert.match(htmlSource, /<script src="js\/phonebook\.js"><\/script>/);
  assert.match(htmlSource, /window\.initPhonebookPage\(\)/);
});

test('agenda expoe API local de contatos por telefone', () => {
  assert.match(phonebookSource, /const STORAGE_KEY = "protocord_phonebook_v1"/);
  assert.match(phonebookSource, /const TRANSCRIBER_STORAGE_KEY = "protocord_ia_transcriber_v1"/);
  assert.match(phonebookSource, /mergeTranscriberContacts/);
  assert.match(phonebookSource, /window\.ProtoCordPhonebook = \{/);
  assert.match(phonebookSource, /findByPhone/);
  assert.match(phonebookSource, /upsertContact/);
  assert.match(phonebookSource, /protocord:phonebook-updated/);
});

test('transcritor salva renomeio na agenda e reaplica nomes conhecidos', () => {
  assert.match(transcriberSource, /rememberTicketContact\(ticket\)/);
  assert.match(transcriberSource, /Contato salvo na agenda\./);
  assert.match(transcriberSource, /applyPhonebookNameToTicket\(active/);
  assert.match(transcriberSource, /window\.addEventListener\("protocord:phonebook-updated"/);
});
