const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const metasSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'metas.js'),
  'utf8'
);

const comparadorSource = fs.readFileSync(
  path.join(__dirname, '..', 'html', 'comparador-textos.html'),
  'utf8'
);

const indexSource = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

const mecanicaSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'mecanica.js'),
  'utf8'
);

test('painel de metas exibe resumo operacional do dia e entrada personalizada', () => {
  assert.match(metasSource, /function todayOverview\(\)/);
  assert.match(metasSource, /function renderTodayBoard\(\)/);
  assert.match(metasSource, /Foco de hoje/);
  assert.match(metasSource, /Metas em dia/);
  assert.match(metasSource, /data-action="entry-custom"/);
  assert.match(metasSource, /Informe o valor que deseja adicionar à meta/);
});

test('comparador de textos oferece modos, normalizacao e resumo copiavel', () => {
  assert.match(comparadorSource, /Comparador de Textos/);
  assert.match(comparadorSource, /html\[data-theme="dark"\]/);
  assert.match(comparadorSource, /function applyGlobalTheme\(theme\)/);
  assert.match(comparadorSource, /type === "protocord-theme"/);
  assert.match(comparadorSource, /data-mode="inline"/);
  assert.match(comparadorSource, /data-mode="split"/);
  assert.match(comparadorSource, /data-mode="word"/);
  assert.match(comparadorSource, /id="ignoreCase"/);
  assert.match(comparadorSource, /id="ignoreSpaces"/);
  assert.match(comparadorSource, /function copySummary\(\)/);
  assert.match(comparadorSource, /Similaridade/);
});

test('comparador de textos aparece no menu lateral e abre como pagina interna', () => {
  assert.match(indexSource, /id="btn-comparador-textos"/);
  assert.match(indexSource, /id="btn-comparador-textos-mobile"/);
  assert.match(indexSource, /mostrarPagina\('comparador-textos'\)/);
  assert.match(indexSource, /id="pagina-comparador-textos"/);
  assert.match(indexSource, /src="html\/comparador-textos\.html"/);
  assert.match(indexSource, /function syncComparadorTheme\(theme\)/);
  assert.match(indexSource, /type: 'protocord-theme'/);
  assert.match(indexSource, /Página Comparador de Textos - Comparação de versões e revisão textual/);
});

test('pagina de historico expõe carregamento global da tabela', () => {
  assert.match(indexSource, /window\.carregarHistorico\(\)/);
  assert.match(mecanicaSource, /window\.carregarHistorico = async function carregarHistorico\(\)/);
  assert.match(mecanicaSource, /return renderizarTabela\(\)/);
});
