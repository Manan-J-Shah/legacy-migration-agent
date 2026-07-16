const fs = require('fs');
const path = require('path');
const { collectUsages } = require('./collectUsages');
const { ROOT, TARGET_ROOT, DATA_DIR, TARGET_NAME } = require('../repoConfig');

/**
 * Stage: discovery
 *
 * Scans TARGET_REPO (default: target-repo) for require('moment'...) and
 * moment(...) usages via @babel/parser + a simple AST walk.
 *
 * Expected output — /pipeline/data[/TARGET_REPO]/manifest.json
 */

const OUTPUT = path.join(DATA_DIR, 'manifest.json');

function listJsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listJsFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      acc.push(full);
    }
  }
  return acc;
}

function run() {
  if (!fs.existsSync(TARGET_ROOT)) {
    throw new Error('Target repo not found: ' + TARGET_ROOT);
  }

  const files = listJsFiles(TARGET_ROOT);
  const manifest = [];

  for (const absPath of files) {
    const code = fs.readFileSync(absPath, 'utf8');
    const relativeFile = path
      .relative(ROOT, absPath)
      .split(path.sep)
      .join('/');
    manifest.push(...collectUsages(code, relativeFile));
  }

  manifest.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

if (require.main === module) {
  const manifest = run();
  console.log(
    `[${TARGET_NAME}] Wrote ${manifest.length} usages to ${path.relative(ROOT, OUTPUT)}`
  );
}

module.exports = { run, OUTPUT };
