const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const kpiSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'kpi-modern.js'),
  'utf8'
);

const legacyDashboardSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'dashboard-liberacoes.js'),
  'utf8'
);

const protocolosSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'protocolos.js'),
  'utf8'
);

const styleSource = fs.readFileSync(
  path.join(__dirname, '..', 'style.css'),
  'utf8'
);
const indexSource = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

test('workspace KPI moderno volta a renderizar a tabela consolidada', () => {
  assert.match(kpiSource, /renderizarTabelaLiberacoes\(filteredRows\)/);
  assert.match(legacyDashboardSource, /className = 'kpi-release-row'/);
  assert.match(legacyDashboardSource, /window\.renderizarTabelaLiberacoes = renderizarTabelaLiberacoes/);
});

test('badges e modal de protocolo usam a nova camada visual operacional', () => {
  assert.match(protocolosSource, /class="kpi-protocol-badge kpi-protocol-badge-\$\{variant\} badge-protocolo"/);
  assert.match(protocolosSource, /id="modal-protocolo-overlay" class="protocol-modal-overlay"/);
  assert.match(protocolosSource, /window\.__protocolosClicksInitialized/);
  assert.match(styleSource, /\.protocol-modal-card \{/);
  assert.match(styleSource, /\.kpi-release-row \{/);
});

test('cards do KPI expõem atalhos acionáveis com modal detalhado', () => {
  assert.match(indexSource, /data-kpi-action="storage"/);
  assert.match(indexSource, /data-kpi-action="errors"/);
  assert.match(indexSource, /data-kpi-action="suggestions"/);
  assert.match(indexSource, /data-kpi-action="releases"/);
  assert.match(indexSource, /data-kpi-action="released"/);
  assert.match(indexSource, /data-kpi-action="latest"/);
  assert.match(kpiSource, /fetch\(window\.getProtocordApiUrl\("\/kpi-insights"\)\)/);
  assert.match(kpiSource, /id = "kpi-insight-modal-overlay"/);
  assert.match(styleSource, /\.kpi-insight-modal \{/);
});

test('modal KPI fecha por delegação e pagina tabelas em blocos de 6 registros', () => {
  assert.match(kpiSource, /event\.target\.closest\("\.kpi-insight-close"\)/);
  assert.match(kpiSource, /overlay\.querySelector\("#kpi-insight-close-btn"\)\?\.addEventListener\("click", closeInsightModal\)/);
  assert.match(kpiSource, /closeButton\.onclick = closeInsightModal/);
  assert.match(kpiSource, /window\.closeKpiInsightModal = closeInsightModal/);
  assert.match(kpiSource, /typeof renderBody === "function"/);
  assert.match(kpiSource, /data-kpi-page-action="prev"/);
  assert.match(kpiSource, /const pageSize = options\.pageSize \|\| 6/);
  assert.match(styleSource, /\.kpi-insight-modal-head \{/);
  assert.match(styleSource, /position: sticky;/);
  assert.match(styleSource, /\.kpi-insight-pagination \{/);
  assert.match(styleSource, /\.kpi-insight-close \{/);
  assert.match(styleSource, /pointer-events: auto;/);
});
