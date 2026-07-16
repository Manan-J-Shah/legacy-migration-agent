const fs = require('fs');
const path = require('path');
const { generate } = require('./generate');
const { runJest, summarize } = require('./runJest');
const { ROOT, DATA_DIR, TESTS_DIR, TARGET_NAME } = require('../repoConfig');

/**
 * Stage: characterize
 *
 * Reads the discovery manifest and generates Jest snapshot tests for every
 * exported function with moment.js call sites. Snapshots are written, then
 * re-run with --ci to lock the current-behavior baseline.
 *
 * TARGET_REPO selects which app tree and which data/tests directories to use.
 */

const INPUT = path.join(DATA_DIR, 'manifest.json');
const OUTPUT = path.join(DATA_DIR, 'characterize.json');
const FIXTURES = path.join(__dirname, 'fixtures.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function run() {
  if (!fs.existsSync(INPUT)) {
    throw new Error('manifest.json not found — run the discovery stage first');
  }

  const manifest = readJson(INPUT);
  const fixtures = readJson(FIXTURES);

  const functions = generate(manifest, fixtures);
  const testsRel = path.relative(ROOT, TESTS_DIR).split(path.sep).join('/');

  const write = runJest({ ci: false, testsDir: testsRel });
  const lock = runJest({ ci: true, testsDir: testsRel });

  const artifact = {
    stage: 'characterize',
    timestamp: new Date().toISOString(),
    basedOn: 'manifest',
    targetRepo: TARGET_NAME,
    testsDir: testsRel,
    clock: fixtures.clock,
    timezone: fixtures.timezone,
    functions,
    baseline: {
      ciLocked: lock.status === 0,
      write: summarize(write.json),
      lock: summarize(lock.json),
    },
    summary: {
      functionCount: functions.length,
      callSitesCovered: functions.reduce(
        (n, f) => n + f.coveredLines.length,
        0
      ),
      callSitesTotal: manifest.length,
    },
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
  return { artifact, lock };
}

if (require.main === module) {
  const { artifact, lock } = run();
  const b = artifact.baseline;
  console.log(
    `[${TARGET_NAME}] Generated ${artifact.functions.length} characterization tests -> ` +
      `${artifact.testsDir}`
  );
  if (b.write) {
    console.log(
      `Baseline written: ${b.write.snapshotsWritten} snapshots across ` +
        `${b.write.numTests} cases`
    );
  }
  console.log(
    `--ci lock: ${b.ciLocked ? 'PASS' : 'FAIL'} ` +
      (b.lock ? `(${b.lock.numPassed}/${b.lock.numTests} passing)` : '')
  );
  if (!b.ciLocked) {
    process.exitCode = 1;
    if (lock.stderr) console.error(lock.stderr);
  }
}

module.exports = { run, INPUT, OUTPUT };
