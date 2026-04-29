const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const projectRoot = path.join(__dirname, '..');

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const filePath = path.resolve(projectRoot, cleanPath);

    if (!filePath.startsWith(projectRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'content-type': contentType(filePath) });
      res.end(data);
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    server,
    url: `http://127.0.0.1:${server.address().port}/index.html`,
  };
}

function rgbChannels(value) {
  const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match ? match.slice(1, 4).map(Number) : [0, 0, 0];
}

function luminance(value) {
  const [r, g, b] = rgbChannels(value);
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

test('tema claro cobre relatórios e metas sem ilhas escuras críticas', async () => {
  const { server, url } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.route('**/api/**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathname = requestUrl.pathname;
      const payload = pathname.endsWith('/modulos')
        ? [{ id: 1, nome: 'Faturamento' }]
        : pathname.endsWith('/protocolos')
          ? [{ ticket: '100', prt: 'PRT1', tipo: 'Erro', modulo: 'Faturamento', release: '22/04/2026', descricao: 'Registro de teste visual' }]
          : pathname.endsWith('/liberados')
            ? [{ prt: 'PRT1', release: '22/04/2026', modulo: 'Faturamento', descricao: 'Registro liberado' }]
            : [];

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'theme-test');
      localStorage.setItem('authTime', new Date().toISOString());
      localStorage.setItem('theme', 'light');
      localStorage.setItem('sidebar_collapsed', 'false');
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      window.mostrarPagina?.('relatorios');
      document.querySelectorAll('[id^="pagina-"]').forEach((element) => {
        element.classList.toggle('hidden', element.id !== 'pagina-relatorios');
      });
    });
    await page.waitForSelector('#pagina-relatorios .reports-table thead', { state: 'attached', timeout: 10000 });
    const reportsTheme = await page.evaluate(() => {
      const head = document.querySelector('#pagina-relatorios .reports-table thead');
      const wrap = document.querySelector('#pagina-relatorios .reports-table-wrap');
      const cell = document.querySelector('#pagina-relatorios .reports-table td') || document.querySelector('#pagina-relatorios .reports-table th');
      const headStyle = getComputedStyle(head);
      const wrapStyle = getComputedStyle(wrap);
      return {
        htmlTheme: document.documentElement.dataset.theme,
        headBg: headStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ? headStyle.backgroundImage : headStyle.backgroundColor,
        wrapBg: wrapStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ? wrapStyle.backgroundImage : wrapStyle.backgroundColor,
        cellColor: getComputedStyle(cell).color,
      };
    });

    assert.equal(reportsTheme.htmlTheme, 'light');
    assert.ok(luminance(reportsTheme.headBg) > 185, `thead claro esperado, recebido ${reportsTheme.headBg}`);
    assert.ok(luminance(reportsTheme.wrapBg) > 185, `container claro esperado, recebido ${reportsTheme.wrapBg}`);
    assert.ok(luminance(reportsTheme.cellColor) < 120, `texto escuro esperado, recebido ${reportsTheme.cellColor}`);

    await page.evaluate(() => {
      window.mostrarPagina?.('metas');
      document.querySelectorAll('[id^="pagina-"]').forEach((element) => {
        element.classList.toggle('hidden', element.id !== 'pagina-metas');
      });
      window.initMetasPage?.();
    });
    await page.waitForSelector('#metas-app .mfu', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(300);
    const metasTheme = await page.evaluate(() => {
      const shell = document.querySelector('#metas-app .mfu');
      const panel = document.querySelector('#metas-app .mfu-panel, #metas-app .mfu-today-card');
      const select = document.querySelector('#metas-app .mfu-theme-select');
      const panelStyle = getComputedStyle(panel);
      return {
        shellTheme: shell?.dataset.theme,
        panelBg: panelStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ? panelStyle.backgroundImage : panelStyle.backgroundColor,
        textColor: getComputedStyle(panel).color,
        selectedTheme: select?.value || document.querySelector('#metas-app')?.__metaflowApi?.state?.themeId,
      };
    });

    assert.equal(metasTheme.shellTheme, 'light');
    assert.equal(metasTheme.selectedTheme, 'global');
    assert.ok(luminance(metasTheme.panelBg) > 185, `painel claro esperado, recebido ${metasTheme.panelBg}`);
    assert.ok(luminance(metasTheme.textColor) < 120, `texto escuro esperado, recebido ${metasTheme.textColor}`);
    assert.deepEqual(consoleErrors, []);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
