const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
// jest's package "exports" blocks require.resolve('jest/bin/jest.js'), so
// locate the CLI via the (accessible) package.json instead.
const JEST_BIN = path.join(
  path.dirname(require.resolve('jest/package.json')),
  'bin',
  'jest.js'
);

/**
 * Run the official jest CLI against the characterization tests.
 * TZ is pinned so date formatting is reproducible across machines.
 *
 * @param {object} opts
 * @param {boolean} opts.ci   pass --ci (fails instead of writing new snapshots)
 * @returns {{status:number, json:object|null}}
 */
function runJest(opts) {
  const ci = Boolean(opts && opts.ci);
  const testsGlob =
    (opts && opts.testsDir) || 'pipeline/characterize/tests';
  const jsonOut = path.join(__dirname, '.jest-result.json');

  const args = [
    JEST_BIN,
    testsGlob,
    '--json',
    '--outputFile',
    jsonOut,
  ];
  if (ci) args.push('--ci');

  const proc = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: Object.assign({}, process.env, { TZ: 'UTC', CI: ci ? 'true' : '' }),
    encoding: 'utf8',
  });

  let json = null;
  if (fs.existsSync(jsonOut)) {
    try {
      json = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
    } catch (err) {
      json = null;
    }
    fs.unlinkSync(jsonOut);
  }

  return { status: proc.status, json, stderr: proc.stderr };
}

function summarize(json) {
  if (!json) return null;
  return {
    numTests: json.numTotalTests,
    numPassed: json.numPassedTests,
    numFailed: json.numFailedTests,
    snapshotsWritten: json.snapshot ? json.snapshot.added : null,
    snapshotsMatched: json.snapshot ? json.snapshot.matched : null,
    snapshotsTotal: json.snapshot ? json.snapshot.total : null,
  };
}

module.exports = { runJest, summarize };
