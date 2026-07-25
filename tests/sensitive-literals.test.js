const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build']);
const IGNORED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.ico']);
const FORBIDDEN_PATTERNS = [
  new RegExp('rhede' + '\\.serviceup\\.app', 'i'),
  new RegExp('zygbtk' + 'cmdnkyqldezknz', 'i'),
  new RegExp('sk-' + '[A-Za-z0-9_-]{20,}'),
  new RegExp('AIza' + '[0-9A-Za-z_-]{20,}'),
  new RegExp('AKIA' + '[0-9A-Z]{16}'),
  new RegExp('-----BEGIN ' + '(RSA |EC |OPENSSH |)PRIVATE KEY-----'),
];

// Explica a responsabilidade de collect files dentro deste modulo.
function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (!IGNORED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

test('codigo e documentacao nao contem literais sensiveis conhecidos', () => {
  const hits = [];
  collectFiles(ROOT).forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    FORBIDDEN_PATTERNS.forEach((pattern) => {
      if (pattern.test(source)) {
        hits.push(path.relative(ROOT, file));
      }
    });
  });

  assert.deepEqual([...new Set(hits)], []);
});
